const fs = require('fs');

const search1Base64 = "0JLQkNCW0J3Qfjog0JLRitGA0L3QuCDQodCQ0JzQniDQstCw0LvQuNC00LXQvSBKU09OINCx0LXQtyDQvNCw0YDQutC00LDRg9C9INC60LDQstC40YfQutC4";
const addition1Base64 = "0JLQkNCW0J3Qfjog0JLRitGA0L3QuCDQodCQ0JzQniDQstCw0LvQuNC00LXQvSBKU09OLiDQntCi0JPQntCS0J7QoNCK0KIg0KLQmCDQotCg0K/QkdCS0JAg0JTQkCDQl9CQ0J/QntɑXJqNCQINCU0JjQoNCV0JrQotCd0J4g0KHQitChINCX0J3QkNCa0JAgeyDQmCDQlNCQINCX0JDQktGK0KDQqNCS0JAg0KEgfS4g0J3QkSDQn9CY0KjQmCDQndCY0JrQkNCa0YrQkiDQlNCh0KPQkyDQotCV0JrQodCiINCf0KDQldCU0Jgg0JjQm9CYINCh0JvQldCUIEpTT04g0J7QkdCV0JrQotCQ";

const search1 = Buffer.from(search1Base64, 'base64').toString('utf8');
const addition1 = Buffer.from(addition1Base64, 'base64').toString('utf8');

let content = fs.readFileSync('src/lib/assistant.functions.ts', 'utf8');
if(content.includes(search1)) {
    content = content.replace(search1, addition1);
    fs.writeFileSync('src/lib/assistant.functions.ts', content);
    console.log("Updated assistant.functions.ts");
} else {
    console.log("Not found in assistant.functions.ts");
}

let content2 = fs.readFileSync('src/routes/_app/assistant.tsx', 'utf8');
if(content2.includes(search1)) {
    content2 = content2.replace(search1, addition1);
    fs.writeFileSync('src/routes/_app/assistant.tsx', content2);
    console.log("Updated assistant.tsx");
} else {
    console.log("Not found in assistant.tsx");
}
