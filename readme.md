# Journey Lib

Journey JavaScript library and database accessor

## Simple DB Usage

1. Get the module from yarn

    `pnpm add @ja-platform/db`

2. import the helper DB (my_script.js)

    ```javascript
    const { Database } = require("@ja-platform/db");
    async function run() {
        const db = await Database.instance({ baseUrl: 'http://test.test/api/v4/testaccount', token: process.env.API_TOKEN });

        // use the api as per documentation (https://docs.journeyapps.com/docs/app-database#section-usage)
        let user = await db.user.first();
        console.log(user.name);
    }
    run();
    ```

3. run the program via `node`

    `API_TOKEN=<some_token> node my_script.js`

## Code Installation

1. clone and run `pnpm` in the root & tools folders
2. run `pnpm build` to build.
3. run `pnpm test` to run all the unit tests.
