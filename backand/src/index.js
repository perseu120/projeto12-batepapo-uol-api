import express from "express";
import cors from "cors";
import chalk from "chalk";
import joi from 'joi';
import { MongoClient, ObjectId } from "mongodb";
import dayjs from 'dayjs';
import dotenv from "dotenv";

const userSchema = joi.object({
    name: joi.string().required()
});

const mensagensScrema = joi.object({
    to:  joi.string().required(),
    text:  joi.string().required(),
    type:  joi.string().valid("private_message", "message").required()
})


dotenv.config()

const mongoClient = new MongoClient(process.env.URL_MONGO);
let db = null;

const promise = mongoClient.connect();

promise.then(() => {
    db = mongoClient.db('apiUOL');
});

const app = express();

app.use([cors(), express.json()]);

app.post('/participants', async (req, res) => {

    // if (!req.body.name) {
    //     res.status(422).send("Nome invalido!");
    //     return;
    // }
    const validacao = userSchema.validate(req.body.name);

    if (validacao.error) {
        console.log(validacao.error.details)
        return;
    }

    try {
        const isName = await db.collection('participantes').findOne({ name: req.body.name });
        if (isName) {
            res.status(409).send("Nome já Existe!");
            return;
        }

        const promise = db.collection('participantes').insertOne({ name: req.body.name, 'lastStatus': Date.now() });

        promise.then(
            await db.collection('mensagens').insertOne({ from: req.body.name, to: "Todos", text: 'entra na sala...', type: 'status', time: dayjs().format('HH:mm:ss') }),
            res.sendStatus(201));

        promise.catch(err => res.sendStatus(500));

    } catch (error) {
        res.sendStatus(500);
    }

})

app.delete('/participants/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await mongoClient.connect();
        const db = mongoClient.db("apiUOL")
        const usersColection = db.collection("participantes");
        await usersColection.deleteOne({ _id: ObjectId(id) })

        res.sendStatus(200)
    } catch (error) {
        res.status(500).send(error)
        mongoClient.close()
    }
});

app.get('/participants', (req, res) => {

    const promise = db.collection('participantes').find({}).toArray();
    promise.then(participantes => res.status(200).send(participantes));

    promise.catch(err => res.sendStatus(500));
})

app.post('/messages', async (req, res) => {

    // const { to, text, type } = req.body;
    // if (!text) {
    //     res.status(422).send("a mensagem não pode esta vazio!");
    //     return;
    // }
    // if (!to) {
    //     res.status(422).send("mensagem sem destino!");
    //     return;
    // }
    // if (type !== 'message' && type !== 'private_message') {
    //     res.status(422).send("o tipo da mensagem é invalido!");
    //     return;
    // }
    const validacao = mensagensScrema.validate(req.body);

    if (validacao.error) {
        console.error(validacao.error.details)
        res.sendStatus(500);
        return;
    }

    try {
        const name = await db.collection('participantes').findOne({ name: req.headers.user });

        if (!name) {
            res.status(422).send("esse usuario não existe!");
            return;
        }

    } catch (error) {
        res.status(500).send(error)
    }

    const promise = db.collection('mensagens').insertOne({ from: req.headers.user, to: req.body.to, text: req.body.text, type: req.body.type, time: dayjs().format('HH:mm:ss') })
    promise.then(() => { res.send(201) });
    promise.catch((err) => res.sendStatus(422));

})

app.get('/messages', (req, res) => {
    const user = req.headers.user;
    const limit = parseInt(req.query.limit);
    if(!limit){
        const promise = db.collection('mensagens').find({ $or: [{ "to": "Todos" }, { "from": user }, { "to": user }] }).toArray();
        promise.then((mens) => { res.status(200).send(mens) });
        promise.catch((err) => res.sendStatus(200));
        return;
    }
    
    const promise = db.collection('mensagens').find({ $or: [{ "to": "Todos" }, { "from": user }, { "to": user }] }).toArray();
    promise.then((mens) => { res.status(200).send(mens.slice(-limit)) });
    promise.catch((err) => res.sendStatus(200));

})

app.post('/status', async (req, res) => {

    const user = req.headers.user;
    try {
        const name = await db.collection('participantes').findOne({ name: user });
        if (!name) {
            res.sendStatus(404);
            return;
        }

        await db.collection('participantes').updateOne({ name: user }, { $set: { 'lastStatus': Date.now() } });
        res.send(200);
    } catch (error) {
        res.status(500).send(error)
    }

})

app.delete('/messages', async (req, res) => {

    try {
        await mongoClient.connect();
        const db = mongoClient.db("apiUOL")
        const usersColection = db.collection("mensagens");
        await usersColection.deleteMany({ "to": "Asta" });

        res.sendStatus(200)
    } catch (error) {
        res.status(500).send(error)
        mongoClient.close()
    }

})

setInterval(async () => {
    const dataAtual = Date.now();
    const usuarioParaDeletar = [];
    try {
        const name  = await db.collection('participantes').find({}).toArray();
        
        name.map((items) => {
            if ((dataAtual - items.lastStatus) >= 10000) {
                usuarioParaDeletar.push(items);
            }
        });

        usuarioParaDeletar.map( async (items)=>{
            await db.collection("participantes").deleteOne({ _id: items._id })
            await db.collection('mensagens').insertOne({ from: items.name, to: "Todos", text: 'sai da sala...', type: 'status', time: dayjs().format('HH:mm:ss') })
        })
        

    } catch (error) {
        console.log(error);
    }

}, 15000);

app.listen(5000, () => {
    console.log(chalk.blue("servidor rodando"));
})