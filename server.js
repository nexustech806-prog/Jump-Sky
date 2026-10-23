require('dotenv').config();
// Optional DNS override for networks that reject MongoDB Atlas SRV queries.
if (process.env.DNS_SERVERS) {
    require('dns').setServers(process.env.DNS_SERVERS.split(',').map(server => server.trim()).filter(Boolean));
}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
const User = require('./Schema/User');
const SaveData = require('./Schema/Save');
const nomesComuns = require('./nomesComuns.json');
const sobrenomesComuns = require('./sobrenomesComuns.json');
const bcrypt = require('bcryptjs');
const nicknames = require('./JS/nicknames');
const { createPhaseChallenge, createBonusChallenge, verifyChallenge } = require('./lib/game-challenges');

const VALID_AVATARS = ['Personagem.png', 'personagem2.png', 'personagem3.png', 'personagem4.png'];
function normalizeSavedAvatar(value) {
    return VALID_AVATARS.find(name => typeof value === 'string' && name.toLowerCase() === value.toLowerCase()) || 'Personagem.png';
}

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: true,       // permite a própria origem
    credentials: true   // necessário pra cookies funcionarem entre front e API
}));

app.use("/CSS", express.static(path.join(__dirname, "CSS")));
app.use("/JS", express.static(path.join(__dirname, "JS")));
app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/audio", express.static(path.join(__dirname, "audio")));


let connecting;
async function connectDB() {
    if (mongoose.connection.readyState === 1) return;
    if (!connecting) {
        connecting = mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
            socketTimeoutMS: 10000
        }).finally(() => { connecting = null; });
    }
    await connecting;
}
async function requireDatabase(req, res, next) {
    try {
        await connectDB();
        next();
    } catch (error) {
        return res.status(503).json({ mensagem: 'Banco de dados indisponível. Tente novamente em instantes.' });
    }
}

// Upserting also repairs accounts left without a save by an interrupted registration.
async function ensureSaveForUser(userId) {
    // Preserve legacy documents, whose generated save _id differs from the account id.
    const existingSave = await SaveData.findOne({ userId });
    if (existingSave) return existingSave;
    try {
        return await SaveData.findOneAndUpdate(
            // The collection's existing unique _id index serializes concurrent repairs;
            // no new userId index or migration of historical saves is required.
            { _id: userId, userId },
            { $setOnInsert: { saveProgress: 1, phase4Completed: false, bonusHighScore: 0 } },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );
    } catch (error) {
        // Another request may have created the same user's save concurrently.
        if (error.code === 11000) {
            const save = await SaveData.findOne({ userId });
            if (save) return save;
        }
        throw error;
    }
}

function normalizedProgress(save) {
    return Math.min(5, Math.max(1, Number(save && save.saveProgress) || 1));
}

function verifySession(token) {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    // Keep existing session cookies valid, but never accept a game challenge as a session.
    if (!payload.userId || (payload.purpose && payload.purpose !== 'session')) throw new Error('Invalid session');
    return payload;
}

let nicknameIndex;
async function ensureNicknameIndex() {
    if (!nicknameIndex) {
        // Use the connected collection directly instead of waiting for Model.init(),
        // which also waits for automatic collection creation and unrelated indexes.
        nicknameIndex = User.collection.createIndex({ registrationNickname: 1 }, { unique: true, sparse: true, maxTimeMS: 5000 });
    }
    try {
        await nicknameIndex;
    } catch (error) {
        nicknameIndex = null;
        throw Object.assign(new Error('Nickname index unavailable'), { code: 'NICKNAME_INDEX_UNAVAILABLE' });
    }
}


function verificarToken(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ mensagem: 'Não autenticado' });
    }

    try {
        const payload = verifySession(token);
        req.userId = payload.userId; 
        next();
    } catch (error) {
        return res.status(401).json({ mensagem: 'Token inválido ou expirado' });
    }
}


function verificarTokenPagina(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect('/login');
    }

    try {
        const payload = verifySession(token);
        req.userId = payload.userId;
        next();
    } catch (error) {
        return res.redirect('/login');
    }
}

const todosNomes = [...nomesComuns, ...sobrenomesComuns];

function contemNomeReal(apelido) {
    const apelidoLower = apelido.toLowerCase();
    const partes = apelidoLower.match(/[a-zà-ú]+/g) || [];

    return partes.some(parte =>
        todosNomes.includes(parte) && parte.length >= 3
    );
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML/Pages/index.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML/Pages/login.html'));
});
app.get('/registrar', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML/Pages/registrar.html'));
});

app.get('/menu', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML/Pages/menu.html'));
});

app.get('/selecionar-avatar', verificarTokenPagina, (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML/Pages/SelecionarAvatar.html'));
});

app.get('/perfil', verificarTokenPagina, (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML/Pages/perfil.html'));
});

app.get('/api/profile', verificarToken, requireDatabase, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ mensagem: 'Conta não encontrada.' });
        const save = await SaveData.findOne({ userId: req.userId });
        return res.json({
            nickname: user.nickname,
            avatar: normalizeSavedAvatar(user.avatar),
            bonusHighScore: save?.bonusHighScore || 0
        });
    } catch (error) {
        return res.status(503).json({ mensagem: 'Não foi possível carregar seu perfil. Tente novamente.' });
    }
});

app.put('/api/profile', verificarToken, requireDatabase, async (req, res) => {
    const { nickname, avatar } = req.body || {};
    if (!VALID_AVATARS.includes(avatar) || typeof nickname !== 'string') {
        return res.status(400).json({ mensagem: 'Escolha um avatar e um apelido das opções disponíveis.' });
    }
    try {
        const current = await User.findById(req.userId);
        if (!current) return res.status(404).json({ mensagem: 'Conta não encontrada.' });
        const update = { avatar };
        // Existing accounts may retain their nickname while changing only the avatar.
        if (nickname !== current.nickname) {
            if (!nicknames.valido(nickname)) {
                return res.status(400).json({ mensagem: 'Escolha um dos apelidos sugeridos.' });
            }
            const taken = await User.findOne({ nickname, _id: { $ne: req.userId } });
            if (taken) return res.status(409).json({ mensagem: 'Esse apelido já foi escolhido. Escolha outro.' });
            await ensureNicknameIndex();
            update.nickname = nickname;
            update.registrationNickname = nickname;
        }
        const user = await User.findByIdAndUpdate(req.userId, { $set: update }, { new: true, runValidators: true });
        if (!user) return res.status(404).json({ mensagem: 'Conta não encontrada.' });
        return res.json({ nickname: user.nickname, avatar: normalizeSavedAvatar(user.avatar) });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ mensagem: 'Esse apelido acabou de ser escolhido. Escolha outro.' });
        return res.status(503).json({ mensagem: 'Não foi possível salvar seu perfil. Tente novamente.' });
    }
});

app.post('/api/nicknames/available', requireDatabase, async (req, res) => {
    const candidates = req.body && req.body.candidates;
    if (!Array.isArray(candidates) || candidates.length > 12 || !candidates.length || !candidates.every(nicknames.valido)) {
        return res.status(400).json({ mensagem: 'Escolha uma das sugestões de apelido.' });
    }
    res.set('Cache-Control', 'no-store');
    try {
        const users = await User.find({ nickname: { $in: candidates } }).select('nickname').lean();
        const used = new Set(users.map(user => user.nickname));
        return res.json({ available: [...new Set(candidates)].filter(name => !used.has(name)) });
    } catch (error) {
        return res.status(503).json({ mensagem: 'Não foi possível consultar os apelidos. Tente novamente.' });
    }
});

app.post('/register', requireDatabase, async (req, res) => {
    let createdUserId;
    try {
        const { nickname, password, avatar } = req.body; 

        if (!nicknames.valido(nickname) || typeof password !== 'string' || !password.length) {
            return res.status(400).json({ mensagem: 'Escolha um apelido sugerido e preencha sua senha.' });
        }

        if (Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(400).json({ mensagem: 'Escolha uma senha com até 72 bytes (letras com acento podem ocupar mais espaço).' });
        }

        if (contemNomeReal(nickname)) {
            return res.status(400).json({
                mensagem: 'Por segurança, não use seu nome real como apelido. Tente outra combinação!'
            });
        }

        const validUser = await User.findOne({ nickname });
        if (validUser) {
            return res.status(409).json({ mensagem: 'Este apelido já existe!' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = new User({
            nickname,
            registrationNickname: nickname,
            password: hashedPassword,
            avatar: normalizeSavedAvatar(avatar) 
        });
        // Signing can fail on missing configuration; do that before persisting either document.
        const token = jwt.sign({ purpose: 'session', userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '2h', algorithm: 'HS256' });
        await ensureNicknameIndex();
        await newUser.save();
        createdUserId = newUser._id;

        await SaveData.create({
            _id: newUser._id,
            userId: newUser._id,
            saveProgress: 1
        });

        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 2 * 60 * 60 * 1000
        });

        return res.status(201).json({ mensagem: 'Usuario criado com sucesso!' });
    } catch (error) {
        if (createdUserId) {
            // Compensate without requiring a replica set. If the database is unreachable,
            // login and phase loading will repair the save when it becomes available.
            await Promise.allSettled([
                SaveData.deleteOne({ userId: createdUserId }),
                User.deleteOne({ _id: createdUserId })
            ]);
        }
        if (error.code === 'NICKNAME_INDEX_UNAVAILABLE') {
            return res.status(503).json({ mensagem: 'Não foi possível preparar o cadastro. Tente novamente em instantes.' });
        }
        if (error.code === 11000) {
            return res.status(409).json({ mensagem: 'Esse apelido acabou de ser escolhido. Vamos buscar outras opções!' });
        }
        console.error("Erro ao salvar:", error.message);
        return res.status(400).json({ mensagem: 'erro ao criar o usuario', erro: error.message });
    }
});


// ===== LOGIN =====
app.post('/login', requireDatabase, async (req, res) => {
    try {
        const { nickname, password } = req.body;

        if (typeof nickname !== 'string' || !nickname.trim() || typeof password !== 'string' || !password.length) {
            return res.status(400).json({ mensagem: 'Preencha seu apelido e sua senha.' });
        }

        const user = await User.findOne({ nickname });
        if (!user) {
            return res.status(404).json({ mensagem: 'Usuário não encontrado!' });
        }

        const senhaCorreta = await bcrypt.compare(password, user.password);
        if (!senhaCorreta) {
            return res.status(401).json({ mensagem: 'Senha incorreta!' });
        }

        await ensureSaveForUser(user._id);

        // gera o token
        const token = jwt.sign(
            { purpose: 'session', userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '2h', algorithm: 'HS256' }
        );

        
        res.cookie('token', token, {
            httpOnly: true,
            secure: true, 
            sameSite: 'lax',
            maxAge: 2 * 60 * 60 * 1000
        });

        return res.status(200).json({ mensagem: 'Login realizado com sucesso!' });
    } catch (error) {
        console.error("Erro no login:", error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

// ===== LOGOUT =====
app.post('/logout', (req, res) => {
    res.clearCookie('token');
    return res.status(200).json({ mensagem: 'Logout realizado' });
});


const fasesConfig = {
    'somando-nas-nuvens': { numero: 1, arquivo: 'FirstScene.html' },
    'subtraindo-no-subsolo': { numero: 2, arquivo: 'SecondScene.html' },
    'multiplicando-no-oceano': { numero: 3, arquivo: 'ThirdScene.html' },
    'dividindo-no-vulcao': { numero: 4, arquivo: 'FourthScene.html' },
    'pulando-no-espaco': { numero: 5, arquivo: 'BonusScene.html' },
};

app.get('/aprendendo-a-jogar', verificarTokenPagina, (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML/Pages/tutorial.html'));
});

app.get('/jogar', verificarTokenPagina, requireDatabase, async (req, res) => {
    try {
        const save = await SaveData.findOne({ userId: req.userId });
        const numero = Math.min(5, Math.max(1, Number(save?.saveProgress) || 1));
        const slug = Object.keys(fasesConfig).find(key => fasesConfig[key].numero === numero);
        return res.redirect(`/${slug}`);
    } catch (error) {
        return res.redirect('/menu');
    }
});

app.get('/:slug', (req, res, next) => fasesConfig[req.params.slug] ? next() : next('route'), verificarTokenPagina, requireDatabase, async (req, res, next) => {
    const config = fasesConfig[req.params.slug];

  
    if (!config) {
        return next();
    }

    try {
        const save = await ensureSaveForUser(req.userId);
        const progress = normalizedProgress(save);

        if (config.numero > progress) {
     
            const slugValido = Object.keys(fasesConfig).find(
                key => fasesConfig[key].numero === progress
            );
            return res.redirect(`/${slugValido}`);
        }

        return res.sendFile(path.join(__dirname, 'HTML/Game', config.arquivo));
    } catch (error) {
        return res.redirect('/login');
    }
});


app.get('/api/save', verificarToken, requireDatabase, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) return res.status(404).json({ mensagem: 'Conta não encontrada.' });
        const save = await ensureSaveForUser(req.userId);

        return res.status(200).json({
            userId: String(req.userId),
            saveProgress: normalizedProgress(save),
            phase4Completed: Boolean(save.phase4Completed || normalizedProgress(save) >= 5),
            bonusHighScore: save.bonusHighScore || 0,
            avatar: normalizeSavedAvatar(user && user.avatar)
        });
    } catch (error) {
        return res.status(400).json({ mensagem: 'Erro ao buscar progresso' });
    }
});


// A escolha acontece após o cadastro; persistir na conta autenticada.
app.put('/api/avatar', verificarToken, requireDatabase, async (req, res) => {
    const avatar = req.body && req.body.avatar;
    if (!VALID_AVATARS.includes(avatar)) {
        return res.status(400).json({ mensagem: 'Escolha um dos personagens disponíveis.' });
    }
    try {
        const user = await User.findByIdAndUpdate(req.userId, { $set: { avatar } }, { new: true, runValidators: true });
        if (!user) return res.status(404).json({ mensagem: 'Conta não encontrada.' });
        return res.status(200).json({ avatar: user.avatar });
    } catch (error) {
        return res.status(500).json({ mensagem: 'Não foi possível salvar o personagem. Tente novamente.' });
    }
});

app.post('/api/game/start', verificarToken, requireDatabase, async (req, res) => {
    const phase = req.body && req.body.fase;
    if (!Number.isInteger(phase) || phase < 1 || phase > 4) {
        return res.status(400).json({ mensagem: 'Escolha uma fase de 1 a 4.' });
    }
    try {
        const save = await ensureSaveForUser(req.userId);
        if (phase > normalizedProgress(save)) return res.status(403).json({ mensagem: 'Conclua a fase anterior primeiro.' });
        return res.json(createPhaseChallenge(req.userId, phase, process.env.JWT_SECRET));
    } catch (error) {
        return res.status(503).json({ mensagem: 'Não foi possível iniciar a fase. Tente novamente.' });
    }
});

app.put('/api/save/avancar', verificarToken, requireDatabase, async (req, res) => {
    const { faseCompletada, challengeToken, answers } = req.body || {};
    try {
        const challenge = verifyChallenge(challengeToken, req.userId, 'phase', process.env.JWT_SECRET);
        if (!Number.isInteger(faseCompletada) || faseCompletada < 1 || faseCompletada > 4 ||
            challenge.phase !== faseCompletada || !Array.isArray(answers) || answers.length !== 4 ||
            !answers.every((answer, index) => Number.isInteger(answer) && answer === challenge.answers[index])) {
            return res.status(400).json({ mensagem: 'Responda às quatro perguntas desta fase antes de avançar.' });
        }
    } catch (error) {
        return res.status(400).json({ mensagem: 'O desafio expirou ou é inválido. Reabra a fase para tentar novamente.' });
    }
    try {
        const selectedSave = await ensureSaveForUser(req.userId);
        const update = { $max: { saveProgress: Math.min(4, faseCompletada + 1) } };
        if (faseCompletada === 4) update.$set = { phase4Completed: true };
        const save = await SaveData.findOneAndUpdate(
            { _id: selectedSave._id, userId: req.userId, saveProgress: { $gte: faseCompletada } },
            update, { new: true, runValidators: true }
        );
        if (!save) return res.status(403).json({ mensagem: 'Conclua a fase anterior primeiro.' });
        return res.status(200).json({ saveProgress: normalizedProgress(save), phase4Completed: Boolean(save.phase4Completed) });
    } catch (error) {
        return res.status(503).json({ mensagem: 'Não foi possível salvar o progresso. Tente novamente.' });
    }
});

app.post('/api/game/bonus', verificarToken, requireDatabase, async (req, res) => {
    try {
        const save = await ensureSaveForUser(req.userId);
        if (!save.phase4Completed && normalizedProgress(save) < 5) {
            return res.status(403).json({ mensagem: 'Conclua a Fase 4 antes do desafio bônus.' });
        }
        return res.json(createBonusChallenge(req.userId, process.env.JWT_SECRET));
    } catch (error) {
        return res.status(503).json({ mensagem: 'Não foi possível carregar o desafio. Tente novamente.' });
    }
});

app.put('/api/save/bonus-unlock', verificarToken, requireDatabase, async (req, res) => {
    const { challengeToken, answer } = req.body || {};
    try {
        const challenge = verifyChallenge(challengeToken, req.userId, 'bonus', process.env.JWT_SECRET);
        if (!Number.isInteger(answer) || answer !== challenge.answer) {
            return res.status(400).json({ mensagem: 'Tente responder ao desafio mais uma vez.' });
        }
    } catch (error) {
        return res.status(400).json({ mensagem: 'O desafio expirou ou é inválido. Carregue outro desafio.' });
    }
    try {
        const selectedSave = await ensureSaveForUser(req.userId);
        const save = await SaveData.findOneAndUpdate(
            { _id: selectedSave._id, userId: req.userId, $or: [{ phase4Completed: true }, { saveProgress: { $gte: 5 } }] },
            { $max: { saveProgress: 5 }, $set: { phase4Completed: true } },
            { new: true, runValidators: true }
        );
        if (!save) return res.status(403).json({ mensagem: 'Conclua a Fase 4 primeiro.' });
        return res.json({ saveProgress: normalizedProgress(save), phase4Completed: true });
    } catch (error) {
        return res.status(503).json({ mensagem: 'Não foi possível salvar o acesso ao bônus. Tente novamente.' });
    }
});

app.put('/api/save/bonus-record', verificarToken, requireDatabase, async (req, res) => {
    const score = req.body && req.body.score;
    if (!Number.isInteger(score) || score < 0 || score > 1000000) {
        return res.status(400).json({ mensagem: 'Pontuação inválida.' });
    }
    try {
        const selectedSave = await ensureSaveForUser(req.userId);
        const save = await SaveData.findOneAndUpdate(
            { _id: selectedSave._id, userId: req.userId, saveProgress: { $gte: 5 } },
            { $max: { bonusHighScore: score } }, { new: true, runValidators: true }
        );
        if (!save) return res.status(403).json({ mensagem: 'O desafio bônus ainda está bloqueado.' });
        return res.json({ bonusHighScore: save.bonusHighScore });
    } catch (error) {
        return res.status(503).json({ mensagem: 'Não foi possível salvar o recorde. Tente novamente.' });
    }
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000 🚀');
});
