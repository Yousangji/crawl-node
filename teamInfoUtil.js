const cheerio = require('cheerio');
const axios = require('axios');
const basicUrl = "https://icobench.com/icos";

/**
 *
 * @param subUrl
 * @returns {Promise<T>}
 */
const getTeamInfo = (subUrl) => {
    return axios({
        method: 'get',
        host: 'icobench.com',
        url: basicUrl.substr(0, basicUrl.lastIndexOf("/")) + subUrl
    })
        .then((response) => {


            const html = response.data;
            const $ = cheerio.load(html);



            //get Info of The Team

            //------------------get Names (Team name, Coin Name)
            const teamName = $('.name > h1').text();

            //-------------------get WhitePaper
            const whitePaperAddr = $('.tabs').find("[href$='.pdf']").attr('href');

            //-------------------get Team social link
            const socialLinks = [];
            const $teamSocialLink = $('.fixed_data > .socials > a');
            $teamSocialLink.each(function (index){
                const social = $(this).attr('class');
                const link = $(this).attr('href');
                socialLinks[index] = {social , link};
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
            $tokenInfo.each(function (){
                const infoLabel = $(this).children('.label').text();
                const infoValue = $(this).children('.value').text();
                tokenInfo[infoLabel]=infoValue;
            });

            console.log(JSON.stringify({teamName, tokenInfo, whitePaperAddr, socialLinks, teamMembersInfo},null , 4));
        })
        .catch(function (error) {
            console.log(error);
        });
};


const getICOLinks = () => axios.get(basicUrl)
    .then((response) => {
        if (response.status === 200) {
            const html = response.data;
            const $ = cheerio.load(html);
            const links = [];
            ($('.name').each(function () {
                links.push($(this).attr('href'));
            }));

            for (let i = 0; i < links.length; i++) {
                getTeamInfo(links[i]);
            }
        }
    });

module.exports = {
    getICOLinks
};