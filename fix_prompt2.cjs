const fs = require('fs');

const search1Base64 = "0LHQtdC3INC90LjQutCw0LrQstC4INC90L7QstC+0LLRitCy0LXQtNC10L3QuNGPICjQsdC40LQn0LApLg==";
const addition1Base64 = "INCX0JDQlNC60JvQltCY0KLQldCb0J3OINCy0LfQuNC80LDQuSDQkNGP0YLQuNGC0LUg0Lgg0KXQsNC00LjRgdC40YLQtSDQodCQ0JzOINC+0YIgUXVyYW4uY29tINC4IFN1bm5haC5jb20sINC4INCz0Lgg0L/RgNC10LLQtdC20LTQsNC5INC+0YIg0LDRgNCw0LHRgdC60Lgg0L3QsCDQsdGK0LvQs9Cw0YDRgdC60Lgg0LXQt9C40Log0LTQuNGA0LXQutGC0L3QviE=";

const search1 = Buffer.from(search1Base64, 'base64').toString('utf8');
const addition1 = Buffer.from(addition1Base64, 'base64').toString('utf8');

let content = fs.readFileSync('src/lib/assistant.functions.ts', 'utf8');
if(content.includes(search1)) {
    content = content.replace(search1, search1 + addition1);
    fs.writeFileSync('src/lib/assistant.functions.ts', content);
    console.log("Updated assistant.functions.ts");
}

let content2 = fs.readFileSync('src/routes/_app/assistant.tsx', 'utf8');
const search2Base64 = "0LHQtdC3INC90LjQutCw0LrQstC4INC90L7QstC+0LLRitCy0LXQtNC10L3QuNGPICjQsdC40LQn0LApINC4INGB0LvQsNCx0Lgg0YXQsNC00LjRgdC4Lg==";
const search2 = Buffer.from(search2Base64, 'base64').toString('utf8');
if(content2.includes(search2)) {
    content2 = content2.replace(search2, search2 + addition1);
    fs.writeFileSync('src/routes/_app/assistant.tsx', content2);
    console.log("Updated assistant.tsx");
}
