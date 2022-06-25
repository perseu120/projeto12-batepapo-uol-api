import express from "express";
import cors from "cors";
import chalk from "chalk";
import { MongoClient, ObjectId } from "mongodb";
import dayjs from 'dayjs';

const mongoClient = new MongoClient('mongodb://127.0.0.1:27017');
let db = null;

const promise = mongoClient.connect();

promise.then(() => {
    db = mongoClient.db('apiUOL');
});

const app = express();

app.use([cors(), express.json()]);

app.post('/participantes', async (req, res) => {

    if (!req.body.name) {
        res.status(422).send("Nome invalido!");
        return;
    }

    try {
        const isName = await db.collection('participantes').findOne({ name: req.body.name });
        if (isName) {
            res.status(409).send("Nome já Existe!");
            return;
        }

        const promise = db.collection('participantes').insertOne({ name: req.body.name, 'lastStatus': Date.now() });
        promise.then(res.sendStatus(201));

        promise.catch(err => res.sendStatus(500));

    } catch (error) {
        res.sendStatus(500);
    }

})

app.delete('/participantes/:id', async (req, res) => {
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

app.get('/participantes', (req, res) => {

    const promise = db.collection('participantes').find({}).toArray();
    promise.then(participantes => res.status(200).send(participantes));

    promise.catch(err => res.sendStatus(500));
})

app.post('/messages', async (req, res) => {

    const { to, text, type } = req.body;
    if (!text) {
        res.status(422).send("a mensagem não pode esta vazio!");
        return;
    }
    if (!to) {
        res.status(422).send("mensagem sem destino!");
        return;
    }
    if(type !== 'message' && type !== 'private_message'){
        res.status(422).send("o tipo da mensagem é invalido!");
        return;
    }
    try {
        const name = await db.collection('participantes').findOne({ name: req.headers.user });
       
        if (!name) {
            res.status(422).send("esse usuario não existe!");
            return;
        }

    } catch {

    }

    const promise = db.collection('mensagens').insertOne({ from: req.headers.user, to: req.body.to, text: req.body.text, type: req.body.type, time: dayjs().format('HH:mm:ss') })
    promise.then(() => { res.send(201) });
    promise.catch((err) => res.sendStatus(422));

})

// app.get('/messages', (req, res) => {

//     const promise = db.collection('mensagens').find({}).toArray();
//     promise.then((mens) => { res.status(200).send(mens) });
//     promise.catch((err) => res.sendStatus(200));

// })

// app.delete('/messages', async (req, res) => {

//     try {
//         await mongoClient.connect();
//         const db = mongoClient.db("apiUOL")
//         const usersColection = db.collection("mensagens");
//         await usersColection.deleteMany({ "to": "Asta" });

//         res.sendStatus(200)
//     } catch (error) {
//         res.status(500).send(error)
//         mongoClient.close()
//     }

// })

app.listen(5000, () => {
    console.log(chalk.blue("servidor rodando"));
})