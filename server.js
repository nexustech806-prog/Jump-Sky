require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
const User = require('./Schema/User');
const SaveData = require('./Schema/Save');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: true,       // permite a própria origem
    credentials: true   // necessário pra cookies funcionarem entre front e API
}));

app.use(express.static(path.join(__dirname)));

// ===== CONEXÃO COM MONGODB (cacheada) =====
let isConnected = false;
async function connectDB() {
    if (isConnected) return;
    try {
        await mongoose.connect(process.env.MONGO_URI);
        isConnected = true;
        console.log('Conectado ao MongoDB com sucesso!');
    } catch (err) {
        console.log('Erro ao conectar:', err);
    }
}
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// ===== MIDDLEWARE: VERIFICA TOKEN =====
function verificarToken(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ mensagem: 'Não autenticado' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = payload.userId; // disponível nas rotas seguintes
        next();
    } catch (error) {
        return res.status(401).json({ mensagem: 'Token inválido ou expirado' });
    }
}

// mesma versão, mas pra páginas HTML (redireciona em vez de responder JSON)
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

// ===== PÁGINAS GERAIS =====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML/Pages/index.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML/Pages/login.html'));
});
app.get('/registrar', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML/Pages/registrar.html'));
});

app.get('/selecionar-avatar', (req, res) => {
    res.sendFile(path.join(__dirname, 'HTML/Pages/SelecionarAvatar.html'));
});
// ===== REGISTRO =====
app.post('/register', async (req, res) => {
    try {
        const { nickname, password, avatar } = req.body; 

        const validUser = await User.findOne({ nickname });
        if (validUser) {
            return res.status(409).json({ mensagem: 'Este apelido já existe!' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = new User({
            nickname,
            password: hashedPassword,
            avatar: avatar || 'personagem.png' 
        });
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
        console.error("Erro ao salvar:", error.message);
        return res.status(400).json({ mensagem: 'erro ao criar o usuario', erro: error.message });
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
    'dividindo-no-vulcao': { numero: 4, arquivo: 'FourthScene.html' }
};

app.get('/:slug', verificarTokenPagina, async (req, res, next) => {
    const config = fasesConfig[req.params.slug];

    // se não é um slug de fase conhecido, passa pra frente (next)
    if (!config) {
        return next();
    }

    try {
        const save = await SaveData.findOne({ userId: new mongoose.Types.ObjectId(req.userId) });
        if (!save) {
            return res.redirect('/login');
        }

        if (config.numero > save.saveProgress) {
            // acha o slug da fase que ele realmente tem acesso
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
        return res.status(200).json({ saveProgress: save.saveProgress });
    } catch (error) {
        return res.status(400).json({ mensagem: 'Erro ao buscar progresso' });
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