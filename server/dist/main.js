"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const bootstrap_1 = require("./bootstrap");
const app_config_1 = require("./config/app-config");
async function main() { const app = await (0, bootstrap_1.createApplication)(); await app.listen(app.get(app_config_1.AppConfig).port, '0.0.0.0'); }
void main();
//# sourceMappingURL=main.js.map