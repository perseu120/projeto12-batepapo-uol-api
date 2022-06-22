import express from "express";
import cors from "cors";
import chalk from "chalk";
import {MongoClient} from "mongodb";

const mongoClient = new MongoClient('mongodb://127.0.0.1:27017');
let db = null;

const promise = mongoClient.connect();

promise.then(()=>{
    db = mongoClient.db('apiUOL');
});

const app = express();

app.use([cors(), express.json()]);



app.get('/participantes', (req, res)=>{

    const promise = db.collection('participantes').find({}).toArray();
    promise.then(participantes => res.status(200).send(participantes));

    promise.catch(err=> res.sendStatus(500));
})

app.listen(5000, () => {
    console.log(chalk.blue("servidor rodando"));
})