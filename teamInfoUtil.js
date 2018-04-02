const cheerio = require('cheerio');
const axios = require('axios');
const basicUrl = "https://icobench.com/icos";


const getTeamInfo = (subUrl) => axios({
    method: 'get',
    host: 'icobench.com',
    url: basicUrl.substr(0, basicUrl.lastIndexOf("/")) + subUrl
})
    .then((response) => {


        const html = response.data;
        const $ = cheerio.load(html);
        const teamInfo = [];


        //get Name of The Team
        const teamName = $('.name').find('h1').text();


        //get TeamMember & Advisor ETC..(Board, Expert)
        const $rowsOfGroup = $('#team > .row');
        $rowsOfGroup.each(function () {
            const groupRole = $(this).prev('h3').text()!=""? $(this).prev('h3').text() : "TeamMember"
                const $groupMembers = $(this).children('div');
                const groupMemberArr =[];

                $groupMembers.each(function (index) {
                    const name = $(this).find('h3').text();
                    const linkedinAddr = $(this).find('.linkedin').attr('href');
                    const socialLink = $(this).find('.socials').children(":not(:contains('LinkedIn'))").attr('href');
                    const position = $(this).find('h4').text();
                    groupMemberArr[index]={name, linkedinAddr, socialLink, position};
                });

            teamInfo.push({[groupRole]:groupMemberArr});

        });

        console.log(JSON.stringify({teamName, teamInfo}));
    })
    .catch(function (error) {
        console.log(error);
    });


const getICOLinks = () => axios.get(basicUrl)
    .then((response) => {
        if (response.status === 200) {
            const html = response.data;
            const $ = cheerio.load(html);
            var links = [];
            ($('.name').each(function () {
                links.push($(this).attr('href'));
            }));

            for (var i = 0; i < links.length; i++) {
                getTeamInfo(links[i]);
            }
        }
    });

module.exports = {
    getICOLinks

};