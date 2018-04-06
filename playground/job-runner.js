//--------- mongoose for mongodb
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/ico_links');
const db = mongoose.connection;
db.on('error', function () {
    console.log('mongo connection failed');
});
db.once('open', function () {
    console.log('connected');
});

const linkSchema = mongoose.Schema({
    url: 'string',
    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now},
})

//--------- crawl
const {crawlURL} = require("./crawl-data-extractor");


//--------- knex-mysql
const knexConfig = require('./playground/dbconfig').knexMysql;
const knexMy = require('knex')(knexConfig);


//case : 1. success 1.1 insert done 1.2 update done 2.failed 2.1 insert not done 2.2 update trial
const addNewJob = function (host, subUrl, done) {
    return knexMy('crawl').insert({host, url: subUrl, done})
};

const updateJob = function (subUrl, host, done) {
    const now = Date.now();
    knexMy('crawl')
        .where('url', subUrl)
        .update({done, last_updat: now, host})
        .increment('trial')
};


const getNotDoneJobs = function () {
    const links = [];
    knexMy('crawl')
        .select('host', 'url')
        .where('done', false)
        .then(function (result) {
                links.push(result)
            }
        );
    return links
};

const checkIfExist = (host, subUrl) => {
    return knexMy('crawl')
        .count(`url`)
        .where({host, 'url': subUrl})
        .then(function (response) {
            console.log("exists res  : ", response, "existres[0] : ", response[0]);
            return response[0] !== 0;
        });


};


const getJobsFromDb = result => {
    const query = 'select links,host from crawl where done == false';
    mysql.connection.query(query, function (error, results, fields) {
        if (error) throw error;
        console.log("mysql connected");

        console.log(results);
        result(results);
    });
};

const sendJobsToUtil = function (jobs) {

};


const addOrUpdateJob = (baseUrl, subUrl) => {
    jobUtil.checkIfExist(baseUrl, subUrl, function (exist) {
        if (exist) {
            jobUtil.updateJob(subUrl, baseUrl, false)
        } else {
            jobUtil.addNewJob(subUrl, baseUrl, false)
        }
    })

    console.log(jobUtil.checkIfExist(baseUrl, subUrl))

};

