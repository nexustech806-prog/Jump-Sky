require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./Schema/User');
const SaveData = require('./Schema/Save');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(cors());

// Conexão do banco MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Conectado ao MongoDB com sucesso!'))
  .catch(err => console.log('Erro ao conectar:', err));

app.post('/register', async (req, res) => {
    try {
        const {nickname, password} = req.body;
        
        const validUser = await User.findOne({ nickname });
        if (validUser) {
            return res.status(409).json({ mensagem: 'Este apelido já existe!' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = new User({ nickname, hashedPassword });
        await newUser.save();

        await SaveData.create({
            userId: newUser._id,
            saveProgress: 1
        });

        console.log("Usuário salvo no MongoDB com sucesso:", );
        return res.status(201).json({ mensagem: 'Usuario criado com sucesso!', idUser: newUser._id});
    } catch (error) {
        console.error("Erro ao salvar:", error.message);
        return res.status(400).json({ mensagem: 'erro ao criar o usuario', erro: error.message });
    }
});

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

        return res.status(200).json({ mensagem: 'Login realizado com sucesso!', idUser: user._id });
    } catch (error) {
        console.error("Erro no login:", error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

app.get('/api/save/:userId/fase/:faseDesejada', async (req, res) => {
    try {
        const { userId, faseDesejada } = req.params;

        const save = await SaveData.findOne({ userId: new mongoose.Types.ObjectId(userId) });
        if (!save) {
            return res.status(404).json({ mensagem: 'Save não encontrado' });
        }

        const faseNum = Number(faseDesejada);
        const liberado = faseNum <= save.saveProgress;

        return res.status(200).json({
            liberado,
            saveProgress: save.saveProgress
        });
    } catch (error) {
        return res.status(400).json({ mensagem: 'Erro ao validar acesso à fase' });
    }
});

app.put('/api/save/:userId/avancar', async (req, res) => {
    try {
        const { userId } = req.params;
        const { faseCompletada } = req.body;

        const save = await SaveData.findOne({ userId: new mongoose.Types.ObjectId(userId) });
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



