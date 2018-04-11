const {crawlLinks, crawlData} = require("../crawl-data-extractor");
const Promise = require("bluebird");
const union = require("lodash.union");
const fs = require("fs");
const path = require('path');
const {URL} = require('url');
const download = require('download');
const writeFile = Promise.promisify(fs.writeFile);
const root = __dirname;
const fileType = require('file-type');
const axios = require('axios');
const {crawlLinks, crawlData} = require("./crawl-data-extractor");

//---------database
const mongoose = require('mongoose');
mongoose.connect('mongodb://10.10.122.49:27017/ico-crawler');
const Schema = mongoose.Schema;
const link = new Schema({
    targetUrl: String,
    baseUrl: String,
    duedate: Date,
    trial: {type: Number, default: 0},
    done: {type: Boolean, default: false},
    error: {type: String, default: null}
}, {
    timestamps: true
});
const data = new Schema({
    teamName: String,
    detailInfo: Schema.Types.Mixed,//new has subtitle, subscribe, tag
    aggregateRatings : Schema.Types.Mixed, //new aggregateRatings{sum,detail}
    whitePaperAddr: String,
    tokenInfo: Schema.Types.Mixed,
    icoInfo: Schema.Types.Mixed,
    socialLinks: Schema.Types.Mixed,
    teamMembersInfo: Schema.Types.Mixed,
    ratings: Schema.Types.Mixed,// new has rated person name,
    milestone: Schema.Types.Mixed,// new has date content
    targetUrl: String,
    whitePaperSave: Schema.Types.Mixed
}, {timestamps: true});
const linkModel = mongoose.model('link', link);
const dataModel = mongoose.model('ico-metadata', data);


/**
 * request with links , crawl data, save data in mongo then, if succeed update link done = true if not update link error.log
 * @param links
 */
const crawlAllData = links => Promise.each(links, link => crawlData(link)
    .then(data => {
        //------------------------ save crawled Data
        dataModel.findOneAndUpdate({"targetUrl": link},
            data, {upsert: true})
            .then(() => {
                    //------------------------update link done if saving data succeed
                    linkModel.findOneAndUpdate({"targetUrl": link}, {
                        $set: {"done": true},
                        $inc: {"trial": 1}
                    }, function (err, res) {
                        //console.log(link, "update succeeded link in links db")
                    })
                }
            )

    }).catch(error => {
        console.log(`[error: ${error}]  while crawling data, link : ${link}`);

        //--------------------update link data(trial, updated, error) in db,  if crawling data failed
        linkModel.findOneAndUpdate({"url": link}, {
            $set: {"error": error},
            $inc: {"trial": 1}
        }, function (err, res) {
            if (err) throw console.log(`[error : ${err}] update crawling failed link `);
            console.log(`update crawling failed link result : ${res}`)
        })
    }), {concurrency: 1})
    .then(() => console.log("done"));

//get links undone from database and then crawl all data
const crawlAllDataWithUndoneLinks = () => linkModel
    .find({})
    .select({"targetUrl": 1, "_id": 0})
    .then(results => results.map(result => result['targetUrl']))
    .then(targetUrls => crawlAllData(targetUrls));


crawlAllDataWithUndoneLinks();