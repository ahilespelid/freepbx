const AppCredentials = require('../db').model('AppCredentials');
const yargs = require('yargs');

const instructions = `A tool for managing AppCredentials, which lets machine users access this service.

This tool exists so we do not need REST routes to manage AppCredentials, which would have required keeping a list of super admin users that can manage AppCredentials via REST.

Create app:
    npm run add-credentials -- --name=somebody --password=pw123

Create or update app:
    npm run ensure-credentials -- --name=somebody --password=pw123

Update existing app:
    npm run update-credentials -- --name=somebody --password="610)asdNewpass456"

Check password on app:
    npm run check-credentials -- --name=somebody --password=calsum4skeltal

List existing app credentials:
    npm run list-credentials

Delete app:
    npm run delete-credentials -- --name=somebody
`;
const argv = yargs
    .usage(instructions)
    .option('action')
    .option('name')
    .option('password')
    .argv;

const action = argv.action;
const name = argv.name;
const password = argv.password;
const fail = (err = '') => {
    if (err.message) {
        process.stderr.write(err.message.toString());
        if (err.stack) {
            process.stderr.write(err.stack.toString());
        }
    } else {
        process.stderr.write(err.toString());
    }
    process.stdout.write('\n');
    process.exit(1);
};
const ok = (message = '') => {
    if (typeof message === 'object') {
        process.stdout.write(JSON.stringify(message, null, 2));
    } else {
        process.stdout.write(message.toString());
    }
    process.stdout.write('\n');
    process.exit(0);
};

switch (action) {
case 'create':
    if (!name) {
        fail('--name flag is required');
    }
    if (!password) {
        fail('--password flag is required');
    }
    AppCredentials.forge({
        name,
        password,
    }).save()
        .then((rec) => {
            ok(rec.toJSON());
        })
        .catch(fail);
    break;

case 'ensure':
    if (!name) {
        fail('--name flag is required');
    }
    if (!password) {
        fail('--password flag is required');
    }
    AppCredentials.where({ name }).fetch()
        .then((rec) => {
            if (!rec) {
                rec = AppCredentials.forge({
                    name,
                    password,
                });
            }
            rec.set('password', password);
            return rec.save();
        })
        .then((rec) => {
            ok(rec.toJSON());
        })
        .catch(fail);
    break;

case 'update':
    if (!name) {
        fail('--name flag is required');
    }
    if (!password) {
        fail('--password flag is required');
    }
    AppCredentials.where({ name }).fetch()
        .then((rec) => {
            if (!rec) {
                fail('app does not exist');
            }
            rec.set('password', password);
            return rec.save();
        })
        .then((rec) => {
            ok(rec.toJSON());
        })
        .catch(fail);
    break;

case 'check':
    if (!name) {
        fail('--name flag is required');
    }
    if (!password) {
        fail('--password flag is required');
    }
    AppCredentials.where({ name }).fetch()
        .then((rec) => {
            if (!rec) {
                process.stderr.write('app does not exist');
                process.exit(1);
            }
            return rec.comparePassword(password).then((passed) => {
                if (passed) {
                    ok(passed);
                } else {
                    fail(passed);
                }
            });
        }).catch(fail);
    break;

case 'list':
    AppCredentials.fetchAll()
        .then((recs) => {
            const names = recs.map(rec => rec.get('name'));
            ok(names);
        }).catch(fail);
    break;

case 'delete':
    if (!name) {
        fail('--name flag is required');
    }
    AppCredentials.where({ name }).fetch()
        .then((rec) => {
            if (!rec) {
                fail('app does not exist');
            }
            return rec.destroy();
        })
        .then(() => ok('OK'))
        .catch(fail);
    break;
default:
    fail(instructions);
}
