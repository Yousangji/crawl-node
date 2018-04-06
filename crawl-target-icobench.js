const cheerio = require('cheerio');
const axios = require('axios');
const baseUrl = "https://icobench.com";
const mongoDB = require('./playground/mongoUtil');

//--------- mongoose for mongodb
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/icoscrap');
const db = mongoose.connection;
const Schema = mongoose.Schema;
db.on('error', function () {
    console.log('mongo connection failed');
});
db.once('open', function () {
    console.log('connected');
});

const icoMetaData = new Schema({
    teamName: String,
    whitePaperAddr: String,
    tokenInfo: Schema.Types.Mixed,
    icoInfo: Schema.Types.Mixed,
    socialLinks: Schema.Types.Mixed,
    teamMembersInfo: Schema.Types.Mixed,
    targetUrl: String

});

const icoMetaModel = mongoose.model('icoMetaData', icoMetaData);


const getICOLinks = (i) => axios.get(baseUrl + "/icos?page = " + i)
    .then((response) => {
            console.log(`${baseUrl}/icos?page=${i}`);
            if (response.status === 200) {
                const html = response.data;
                const $ = cheerio.load(html);
                const links = [];
                const linksArr = $('.name');
                let times = 0;
                linksArr.each(function () {
                    const url = $(this).attr('href');
                    console.log(`url:${url} , i: ${i}`);
                    icoMetaModel.count({targetUrl: baseUrl + url}, function (err, count) {
                        console.log(`err : ${err} ,  count : ${count}`);
                        if (err) throw err;
                        if (count < 1) {
                            links.push(baseUrl + url);
                            if (times === linksArr.length - 1) {
                                sendUrlsToCrawl(links)
                            }
                        }
                        times++
                    });
                });
            }
        }
    );

const sendUrlsToCrawl = (links) => {
    for (let i = 0; i < links.length; i++) {
        setTimeout(function () {
            crawlURL(links[i]);
            console.log("loop i : " + i)
        }, 3000 * i);
    }
};

const crawlURL = targetUrl => axios
    .get(targetUrl)
    .then(response => {
        const $ = cheerio.load(response.data);

        // get information
        //get information of The Team
        //------------------get TeamNames (Team name)
        let teamName = $('.name > h1').text();
        let preICO = false;
        if (teamName.includes('(PreICO)')) {
            teamName = teamName.replace('(PreICO)', '');
            preICO = true;
        }
        //-------------------get WhitePaper Address
        const whitePaperAddr = $('.tabs > a:nth-child(6)').attr('href');


        //-------------------get Team social link
        const teamSocialLinks = [];
        const $teamSocialLink = $('.fixed_data > .socials > a');
        $teamSocialLink.each(function (index) {
            const social = $(this).attr('class');
            const link = $(this).attr('href');
            teamSocialLinks[index] = {social, link};
        });


        //-------------------get TeamMember & Advisor ETC..(Board, Expert)
        const teamMembersInfo = [];
        const $rowsOfGroup = $('#team > .row');
        $rowsOfGroup.each(function () {
            const groupRole = $(this).prev('h3').text() !== "" ? $(this).prev('h3').text() : "TeamMember";
            const $groupMembers = $(this).children('div');
            const groupMemberArr = [];

            //get MetaData of Member
            $groupMembers.each(function (index) {
                const name = $(this).find('h3').text();
                const linkedinAddr = $(this).find('.linkedin').attr('href');
                const socialLink = $(this).find('.socials').children(":not(:contains('LinkedIn'))").attr('href');
                const position = $(this).find('h4').text();
                groupMemberArr[index] = {name, linkedinAddr, socialLink, position};
            });

            teamMembersInfo.push({[groupRole]: groupMemberArr});

        });

        //------------------ get ICO Info
        const icoInfo = {};
        const icoPeriod = $('.financial_data').find('small').text().split(' - ');
        const icoStart = new Date(icoPeriod[0]);
        const icoEnd = new Date(icoPeriod[1]);
        icoInfo["icoStart"] = icoStart;
        icoInfo["icoEnd"] = icoEnd;
        icoInfo["preICO"] = preICO;
        const $icoInfo = $('.financial_data > .data_row');
        $icoInfo.each(function () {
            const icoInfoLabel = $(this).children('div:nth-child(1)').text().trim();
            icoInfo[icoInfoLabel] = $(this).children('div:nth-child(2)').text();
        });


        //------------------get Token Info
        const tokenInfo = {};
        const $tokenInfo = $('.box_left > .row');
        $tokenInfo.each(function () {
            if ($(this).children('h4').text() === "Bonus") {
                const bonus = $(this).children('.bonus_text').text();
                tokenInfo["bonus"] = bonus;
            } else {

                const tokenInfoLabel = $(this).children('.label').text();
                tokenInfo[tokenInfoLabel] = $(this).children('.value').text();
            }
        });

        //-------- data result
        const icoData = new icoMetaModel({
            teamName,
            whitePaperAddr,
            tokenInfo,
            icoInfo,
            socialLinks: teamSocialLinks,
            teamMembersInfo,
            targetUrl
        });


        //-------- store data
        //1.
        icoData.save(function (err) {
            if (err) throw console.error(err);
        });

    });


const printErrAndSuccessLists = (subUrl) => {
    console.log("count : " + internal_counter, subUrl);
    if (++internal_counter === total) {
        console.log("error :" + errorUrlList, "success :" + successUrlList)
    }
};

module.exports = {
    getICOLinks, crawlURL
};