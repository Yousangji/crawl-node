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

        //-------------------get WhitePaper Address
        const whitePaperAddr = $('.tabs').find("[href$='.pdf']").attr('href');

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
                const bonus = $(this).children('.bonus_text').text();
                tokenInfo["bonus"] = bonus;
            } else {

                const tokenInfoLabel = $(this).children('.label').text();
                tokenInfo[tokenInfoLabel] = $(this).children('.value').text();
            }
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
            icoInfo[icoInfoLabel] = $(this).children('div:nth-child(2)').text().trim();
        });

        return {
            teamName,
            whitePaperAddr,
            tokenInfo,
            icoInfo,
            socialLinks,
            teamMembersInfo,
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