const {getICOLinks} = require("./crawl-target-icobench");
let i = 0;
const limit =3;

const icobenchCrawl = setInterval(function () {
    i++;
    if(i > limit){
        console.log("종료");
        clearInterval(icobenchCrawl)
    }
    getICOLinks(i);
}, 5000);

