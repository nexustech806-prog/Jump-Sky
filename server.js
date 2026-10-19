require('dotenv').config();
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
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        return res.status(503).json({ mensagem: 'Banco de dados indisponível. Tente novamente em instantes.' });
    }
});

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
        const payload = jwt.verify(token, process.env.JWT_SECRET);
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
        const payload = jwt.verify(token, process.env.JWT_SECRET);
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

app.get('/selecionar-avatar', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML/Pages/SelecionarAvatar.html'));
});

app.post('/api/nicknames/available', async (req, res) => {
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

app.post('/register', async (req, res) => {
    try {
        const { nickname, password, avatar } = req.body; 

        if (!nicknames.valido(nickname) || typeof password !== 'string' || !password.length) {
            return res.status(400).json({ mensagem: 'Escolha um apelido sugerido e preencha sua senha.' });
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
        await ensureNicknameIndex();
        await newUser.save();

        await SaveData.create({
            userId: newUser._id,
            saveProgress: 1
        });

        const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '2h' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 2 * 60 * 60 * 1000
        });

        return res.status(201).json({ mensagem: 'Usuario criado com sucesso!' });
    } catch (error) {
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

const AVATARES_VALIDOS = [
    'personagem.png',
    'personagem2.png',
    'personagem3.png',
    'personagem4.png',
];

app.put('/api/avatar', verificarToken, async (req, res) => {
    try {
        const { avatar } = req.body;

        if (typeof avatar !== 'string' || !AVATARES_VALIDOS.includes(avatar)) {
            return res.status(400).json({ mensagem: 'Avatar inválido' });
        }

        const user = await User.findByIdAndUpdate(
            req.userId,
            { avatar },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ mensagem: 'Usuário não encontrado' });
        }

        return res.status(200).json({ avatar: user.avatar });
    } catch (error) {
        console.error('Erro ao salvar avatar:', error.message);
        return res.status(500).json({ mensagem: 'Erro ao salvar avatar' });
    }
});

// ===== LOGIN =====
app.post('/login', async (req, res) => {
    try {
        const { nickname, password } = req.body;

        const user = await User.findOne({ nickname });
        if (!user) {
            return res.status(404).json({ mensagem: 'Usuário não encontrado!' });
        }

        const senhaCorreta = await bcrypt.compare(password, user.password);
        if (!senhaCorreta) {
            return res.status(401).json({ mensagem: 'Senha incorreta!' });
        }

        // gera o token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
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

app.get('/:slug', verificarTokenPagina, async (req, res, next) => {
    const config = fasesConfig[req.params.slug];

  
    if (!config) {
        return next();
    }

    try {
        const save = await SaveData.findOne({ userId: new mongoose.Types.ObjectId(req.userId) });
        if (!save) {
            return res.redirect('/login');
        }

        if (config.numero > save.saveProgress) {
     
            const slugValido = Object.keys(fasesConfig).find(
                key => fasesConfig[key].numero === save.saveProgress
            );
            return res.redirect(`/${slugValido}`);
        }

        return res.sendFile(path.join(__dirname, 'HTML/Game', config.arquivo));
    } catch (error) {
        return res.redirect('/login');
    }
});


app.get('/api/save', verificarToken, async (req, res) => {
    try {
        const save = await SaveData.findOne({ userId: new mongoose.Types.ObjectId(req.userId) });
        if (!save) {
            return res.status(404).json({ mensagem: 'Save não encontrado' });
        }

        const user = await User.findById(req.userId);

        return res.status(200).json({
            saveProgress: save.saveProgress,
            avatar: normalizeSavedAvatar(user && user.avatar)
        });
    } catch (error) {
        return res.status(400).json({ mensagem: 'Erro ao buscar progresso' });
    }
});


// A escolha acontece após o cadastro; persistir na conta autenticada.
app.put('/api/avatar', verificarToken, async (req, res) => {
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

app.put('/api/save/avancar', verificarToken, async (req, res) => {
    try {
        const faseCompletada = Number(req.body.faseCompletada);

        const save = await SaveData.findOne({ userId: new mongoose.Types.ObjectId(req.userId) });
        if (!save) {
            return res.status(404).json({ mensagem: 'Save não encontrado' });
        }

        if (faseCompletada === save.saveProgress) {
            save.saveProgress += 1;
            await save.save();
        }

        return res.status(200).json({ saveProgress: save.saveProgress });
    } catch (error) {
        return res.status(400).json({ mensagem: 'Erro ao atualizar progresso', erro: error.message });
    }
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000 🚀');
});
