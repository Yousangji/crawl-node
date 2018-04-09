const Promise = require("bluebird");
const union = require("lodash.union");
const fs = require("fs");
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
},{
    timestamps : true});
const data = new Schema({
    teamName: String,
    whitePaperAddr: String,
    tokenInfo: Schema.Types.Mixed,
    icoInfo: Schema.Types.Mixed,
    socialLinks: Schema.Types.Mixed,
    teamMembersInfo: Schema.Types.Mixed,
    targetUrl: String
},{timestamps :true});
const linkModel = mongoose.model('link', link);
const dataModel = mongoose.model('ico-metadata', data);

/*
request every chart page and get all links return as a array
 */
const crawlAllLinks = () => {
    const total = 228;
    const counter = [...new Array(total).keys()]; // array from 0 to 254
    return Promise.map(counter, i => crawlLinks(`https://icobench.com/icos?page=${i + 1}`, "/ico/"), {concurrency: 1})
        .then(result => {
            // same as  union.apply(null,result); same as union(result[0],result[1],...)
            return union(...result);
        });
};


//pass links array and write db
const saveCrawledLinks = crawlAllLinks()
    .then(links => {
        //-------------save link in DB
        Promise.map(links, link => {
            linkModel.findOneAndUpdate({"targetUrl": `https://icobench.com${link}`}, {
                $set: {
                    "targetUrl": `https://icobench.com${link}`,
                    baseUrl: `https://icobench.com`,
                }
            }, {upsert: true, setDefaultsOnInsert: true, new: true}, function (err, doc) {
                if (err) console.log("mongo error : error while upserting new links");
                //console.log(`link : ${link } / db save done `)
            })
        })
    })
    .then(() => {
        console.log("done");
       // mongoose.connection.close()
    });




/**
 * request with links , crawl data, save data in mongo then, if succeed update link done = true if not update link error.log
 * @param links
 */
const crawlAllData = links => {
    //2. promise crawlData
    Promise.each(links, link => {
        return crawlData(link)
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
                    if(err) throw console.log(`[error : ${err}] update crawling failed link `);
                    console.log(`update crawling failed link result : ${res}`)
                })
            })
    }, {concurrency: 1})
        .then(() => console.log("done"))
};

//get links undone from database and then crawl all data
const crawlAllDataWithUndoneLinks = linkModel.find({'done': false},).select({"targetUrl":1,"_id":0})
    .then(results => results.map(result => result['targetUrl']))
    .then(targetUrls => crawlAllData(targetUrls));
