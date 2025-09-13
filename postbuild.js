const fs = require("fs");
const path = "./out/CNAME";
fs.writeFileSync(path, "markme.aarifshaik.me");
console.log("✅ CNAME file written:", path);
