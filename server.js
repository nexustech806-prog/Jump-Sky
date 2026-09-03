const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./Schema/User');
const SaveData = require('./Schema/Save');

const app = express();
app.use(express.json());
app.use(cors());

// Conexão do banco MongoDB
mongoose.connect('mongodb+srv://nexustech806_db_user:Ovoovo13@jump-sky.cnidlzl.mongodb.net/?appName=Jump-Sky')
  .then(() => console.log('Conectado ao MongoDB com sucesso!'))
  .catch(err => console.log('Erro ao conectar:', err));

app.post('/register', async (req, res) => {
    try {
        const { nickname, password } = req.body;
        
        const validUser = await User.findOne({ nickname });
        if (validUser) {
            return res.status(409).json({ mensagem: 'Este apelido já existe!' });
        }

        const newUser = new User({ nickname, password });
        await newUser.save();

        // Criação do save vinculado usando o model correto (SaveData)
        await SaveData.create({
            userId: newUser._id,
            saveProgress: 1
        });

        console.log("Usuário salvo no MongoDB com sucesso:", newUser);
        return res.status(201).json({ mensagem: 'Usuario criado com sucesso!' });
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

        if (user.password !== password) {
            return res.status(401).json({ mensagem: 'Senha incorreta!' });
        }

        console.log("Login realizado com sucesso para:", nickname);
        return res.status(200).json({ mensagem: 'Login realizado com sucesso!' });
    } catch (error) {
        console.error("Erro no login:", error.message);
        return res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

app.get('/api/save/:userId', async (req, res) => {
    try {
        const save = await SaveData.findOne({ userId: new mongoose.Types.ObjectId(req.params.userId) });
        if (!save) {
            return res.status(404).json({ message: 'Você não pode acessar está Fase!' });
        } else {
            return res.status(200).json({ message: 'Fase liberada!', saveProgress: save.saveProgress });
        }
    } catch (error) {
        return res.status(400).json({ mensagem: 'nao foi possivel validar se este usuario pertence a fase' });
    }
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000 🚀');
});