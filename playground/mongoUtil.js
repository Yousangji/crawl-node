const {MongoClient, ObjectID} = require('mongodb');
const test = require('assert');
const mongoUrl = "mongodb://localhost:27017";




const mongoDo = (toDo, collectionName) => {
    MongoClient.connect(mongoUrl, function (err, db) {
        // if (err) throw err;
        console.log("mongo connected");
        const mydb = db.db(collectionName);
        toDo(mydb, (result) => {
            db.close();
            console.log("mongo closed")
        })
    })
};

const insertMany = function (
    dataList = [],
    resultCB = () => {
    },
    {name} = {name: 'icobench'},
    collectionName = 'icoscrap'
) {
    const toDo = (db, doneCB) => {
        console.log('Prepare to insert dataList', JSON.stringify(dataList), `to ${name}`);

        const dataLength = dataList.length;
        const collection = db.collection(name);
        collection.insertMany(dataList, {
            ordered: false
        }, function (err, result) {
            // test.equal(err, null)
            if (err) {
                console.log(err)
            } else {
                test.equal(dataLength, result.result.n);
                test.equal(dataLength, result.ops.length);

                console.log(`Inserted ${dataLength} items into the ${name} collection`)
            }

            resultCB(result);
            doneCB(result)
        })
    };

    mongoDo(toDo, collectionName)
};

const insertOne = function (
    data = null,
    resultCB = () => {
    },
    {name} = {name: 'icobench'},
    collectionName = 'icoscrap'
) {
    test.ok(!!data && data !== '');
    console.log('Prepare to insert data', JSON.stringify(data), `to ${name}`);

    const toDo = (db, doneCB) => {
        const collection = db.collection(name);
        collection.insertOne(data, function (err, result) {
            if (err) {
                console.log(err)
            } else {
                test.equal(1, result.result.n);
                test.equal(1, result.ops.length);

                console.log('Inserted', JSON.stringify(data), `into the ${name} collection`)
            }

            resultCB(result);
            doneCB(result)
        })
    };

    mongoDo(toDo, collectionName)
}


const count = function (
    query = {},
    resultCB = () => {
    },
    {name} = {name: 'icobench'},
    collectionName = 'icoscrap'
) {
    const toDo = (db, doneCB) => {
        console.log(`Prepare to get count with query ${JSON.stringify(query)}`);

        const collection = db.collection(name);
        collection.count(query, function (err, result) {
            test.equal(err, null);

            console.log(`Count result ${result} records!`);

            resultCB(result);
            doneCB(result)
        })
    };

    mongoDo(toDo, collectionName)
};

module.exports = {
    insertMany,
    insertOne,
    count,
};
