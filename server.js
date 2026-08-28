const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./JS/User')

const app = express();
app.use(express.json());
app.use(cors());
    //conexao do banco Mongodb
    mongoose.connect('mongodb+srv://nexustech806_db_user:Ovoovo13@jump-sky.cnidlzl.mongodb.net/?appName=Jump-Sky')
  .then(() => console.log('Conectado ao MongoDB com sucesso!'))
  .catch(err => console.log('Erro ao conectar:', err));
    app.post('/register', async(req, res) => {
      try{
        const {nickname, password} = req.body;
        const newUser = new User({nickname, password});
        await newUser.save();
        console.log("Usuário salvo no MongoDB com sucesso:", newUser);
        res.status(201).json({mensagem: 'Usuario criado com sucesso!'});
      } catch (error) {
        console.error("Erro ao salvar:", error.message);
        res.status(400).json({mensagem:'erro ao criar o usuario', erro: error.message })
      }
    })

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
        res.status(200).json({ mensagem: 'Login realizado com sucesso!' });
    } catch (error) {
        console.error("Erro no login:", error.message);
        res.status(500).json({ mensagem: 'Erro interno no servidor' });
    }
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000 🚀');
});