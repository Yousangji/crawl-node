const axios = require('axios');
const cheerio = require('cheerio');

/**
 * get url and extract data and saved to database and return any new jobs if found
 * @param subUrl
 * @returns {Promise<T>}
 */
const crawlData = targetUrl => axios
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


        //-------------------aggregateRatings{sum,aggr}
        const total = $('.rating > div:nth-child(1)').attr('content');
        const detail = {};
        $('.rating > .distribution > .col_4').each(function () {
            const aggrRateValue = $(this).contents().first().text().trim();
            const aggrRateLabel = $(this).contents().next().text().trim();
            detail[aggrRateLabel] = aggrRateValue
        });
        const aggregateRatings = {total, detail};

        //------------------get detail information of Team
        const subTitle = $('.name > h2').text().trim();
        const detailIco = $('.ico_information > p').text().trim();
        const $categories = $('.ico_information > .categories > a');
        const categories = [];
        $categories.each(function () {
            categories.push($(this).text().trim())
        });
        const detailInfo = {subTitle, detailIco, categories};


        //-----------------get Mielstones [] : {condition,content}
        const $bubbles = $('.bubble');
        const milestone = [];
        $bubbles.each(function () {
            const condition = $(this).children('.condition').text().trim();
            const content = $(this).children('p').text().trim();
            milestone.push({condition, content})
        });

        //-----------------get Ratings []: {raterInfo, rates, review}
        const $ratings = $('.ratings_list > .row');
        const ratings = [];
        $ratings.each(function () {
            //--------------data {name,position,distribution,ratedAt}
            const $data = $(this).children('.data');
            const name = $data.children('.name').text();
            const title = $data.children('.title').text().split('Rated on');
            const position = title[0];
            const ratedAt = title[1];
            const distribution = $(this).children('.distribution').text().trim();
            const raterInfo = {name, position, distribution, ratedAt};

            //--------------rate {team,vision,product}
            const rates = {};
            $(this).find('.rate > .col_3').each(
                function () {
                    const rateLabel = $(this).contents().next().text();
                    const rateValue = $(this).contents().first().text();
                    rates[rateLabel] = rateValue;
                }
            );

            //------------review {review content,agree}
            const $review = $(this).children('.review');
            const content = $review.children('p').text();
            const agreeNum = $review.children('.agree_count').text().substring(0, 0);
            const review = {content, agreeNum}

            ratings.push({raterInfo, rates, review})
        });


        //-------------------get WhitePaper Address
        const whitePaperAddr = $('.tabs > a:nth-child(6)').prop('href');


        //-------------------get Team social link
        const socialLinks = [];
        const $teamSocialLink = $('.fixed_data > .socials > a');
        $teamSocialLink.each(function (index) {
            const social = $(this).attr('class');
            const link = $(this).attr('href');
            socialLinks[index] = {social, link};
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

        //------------------get Token Info
        const tokenInfo = {};
        const $tokenInfo = $('.box_left > .row');
        $tokenInfo.each(function () {
            if ($(this).children('h4').text() === "Bonus") {
                const bonus = $(this).children('.bonus_text').text().trim();
                tokenInfo["bonus"] = bonus;
            } else {

                const tokenInfoLabel = $(this).children('.label').text();
                tokenInfo[tokenInfoLabel] = $(this).children('.value').text();
            }
        });

        //----------------get Investment Info
        const investInfo ={};
        const $investInfo = $('.box_right > .row');
        $investInfo.each(function(){
            const investInfoLabel = $(this).children('.label').text();
            investInfo[investInfoLabel] = $(this).children('.value').text();
        });

        const financialInfo = {tokenInfo,investInfo};

        //------------------ get ICO Info
        const icoInfo = {};
            //only having time info, put icoStart/icoEnd data
        const hasTime = $('.financial_data > .row > div').children('label').text();
        if(hasTime === "Time") {
            const icoPeriod = $('.financial_data > .row > div').children('small').text().split(' - ');
            const icoStart = icoPeriod[0] === '' ? null : new Date(icoPeriod[0]);
            const icoEnd = icoPeriod[1] === '' ? null : new Date(icoPeriod[1]);
            icoInfo["icoStart"] = icoStart;
            icoInfo["icoEnd"] = icoEnd;
        }
            icoInfo["preICO"] = preICO;

        const $icoInfo = $('.financial_data > .data_row');
        $icoInfo.each(function () {
            const icoInfoLabel = $(this).children('div:nth-child(1)').text().trim();
            icoInfo[icoInfoLabel] = $(this).children('div:nth-child(2)').text().trim();
        });

        return {
            teamName,
            detailInfo,
            aggregateRatings,
            whitePaperAddr,
            financialInfo,
            icoInfo,
            socialLinks,
            teamMembersInfo,
            ratings,
            milestone,
            targetUrl
        };
    });

const crawlLinks = (targetUrl, linkStartsWith) => axios
    .get(targetUrl)
    .then(response => {
        const $ = cheerio.load(response.data);
        //-------- data result
        // find all links need to be crawl later
        const links = [];
        // getting ico links
        $(`a[href^="${linkStartsWith}"]`).each(function () {
            const link = $(this).attr('href');
            if (!links.includes(link)) {
                links.push(link);
            }
        });
        return links;
    });

module.exports = {
    crawlData,
    crawlLinks
};