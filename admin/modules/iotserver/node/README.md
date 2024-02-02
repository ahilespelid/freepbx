# Service Skeleton

This project serves as a starting point for a new API service. It incorporates many of the best practices that we've learned over the years from (re-)building many, many API services in Node.

https://www.youtube.com/watch?v=w82CqjaDKmA

A small list of things in this application:

1. A working "Hello World" REST API service, using Swagger for service documentation and controller routing as well as Basic Authentication.

2. Database models that implement the backing authentication information for the service. The models expect to use a MySQL server.

3. Unit tests!

4. Lots of infrastructure for running the service, testing it both locally and in a Continuous Integration framework, and deploying it in a Docker Container.

More information on all of this can be found in the sections below.

# Structure of the Application

The following structure is recommended for any API service:

* `[root]`: Container definitions, unit / integration test helpers, Makefile(s), style lint guidelines, and more.
  * [`server.js`](server.js): The entry point of the service. This should do the bare minimum necessary to ensure that the system is in the necessary state for the service to execute, then invoke the [bootstraper](src/bootstrap.js). Note that the initializing of the service's components is separated out from the entry point to allow unit testing to provide a different bootstrapper so that the system can be initialized differently.
* `build`: Artifacts generated as a result of building the service. May be empty for many services.
* [`config`](config/): Service configuration files. These should always contain:
  * [`default.js`](config/default.js): Default configuration
  * [`custom-environment-variables.js`](config/custom-environment-variables.js): Environment variable overrides for configuration values. This is typically how secrets and other sensitive information is injected into a containerized deployment of the service.
  * `[environment-name.js]`: Environment specific overrides to the default configuration values. The names of these files should match the expected values for the `NODE_ENV` environment variable.
* [`migrations`](migrations/): [Knex database migrations](#database-migrations).
* [`node_modules`](node_modules/): All external dependencies of the service, as installed by `npm`
* [`src`](src/): All source code for the service.
  * [`bootstrap.js`](src/bootstrap.js): The bootstrap file is responsible for initializing resources. The entry point of the service invokes this once it has determined that the system prerequisites are in place.
  * [`api`](src/api/): Service API, including the Swagger definition, controllers, and other infrastructure used by [`swagger-express-mw`](https://github.com/APIDevTools/swagger-express-middleware). Note that we place the canonical structure recommended by Swagger inside `src` to avoid confusion / conflicts with test code, scripts, etc.
    * [`controllers`](src/api/controllers/): The implementation of routes defined in the Swagger API.
    * [`helpers`](src/api/helpers/): Common routines used by the controllers that are not appropriate for the `lib` folder.
    * [`mocks`](src/api/mocks/): Controllers used when Swagger is invoked in mock mode.
    * [`swagger`](src/api/swagger/): The actual `yml` definition of the API, using the OpenAPI 2.0 specification.
  * [`lib`](src/lib/): Library code to be used throughout the service. This typically includes request / response logging services, custom Prometheus metrics, external service libraries, etc.
  * [`models`](src/models/): Domain models for the service. This could include Models that are defined in the service's database, as well as models that wrap domain objects owned by external services.
  * [`services`](src/services/): Services typically refer to classes of code that have some state associated with them that are inherently more complex than what a Model typically provides, or that provide a layer of abstraction on top of many domain models. An example would be a class of business logic that interprets the current state of multiple Models that is queried by a route in a controller.
* [`test`](test/): Unit test code.

# Service Setup

This service uses at least one private package on our internal BitBucket server. In order to get the shared SSH key used for the server, do the following:

1. Clone the `shared-ssh-key` repo:

```
$ git clone https://user@stash.digium.com/stash/scm/cir/shared-ssh-key.git
```

2. Place the key in the root of this application directory for Docker:

```
$ cp shared-ssh-key/cirrusid skeleton-app/
$ chmod 600 skeleton-app/cirrusid
```

3. Install the key locally for NPM:

```
$ cp shared-ssh-key/cirrusid* ~/.ssh/
$ chmod 600 ~/.ssh/cirrusid*
$ ssh-add ~/.ssh/cirrusid
```

4. Add the following to your `ssh` configuration:

```
$ vim ~/.ssh/config

...

Host    stash.digium.com
        IdentityFile    /{path-to-user-directory}/.ssh/cirrusid
        IdentitiesOnly  yes
```

5. You can now run `npm install` to install the project dependencies:

```
$ npm install
```

# Database

The service expects to connect to a MySQL database upon service start. It will attempt to connect to the database a total of 10 times before giving up and killing itself. You will know that you don't have your database set up or have its connection information configured properly when you see the following `ERROR` messages on service start:

```
21:55:43.469Z  WARN service-skeleton: Failed to connect to database (1 of 10)
  Error: ER_ACCESS_DENIED_ERROR: Access denied for user 'sangoma'@'172.17.0.1' (using password: YES)
      at Handshake.Sequence._packetToError (/Users/mjordan/Projects/bsi/service-skeleton/node_modules/mysql/lib/protocol/sequences/Sequence.js:47:14)
      ...
```

Configuraiton of the database connection is done in the various environment configuration files in [`config`](config/), and can also be overridden using the following environment variables:

* `MYSQL_HOST`: Address or hostname of the MySQL server.
* `MYSQL_USER`: Username to connect as.
* `MYSQL_PASSWORD`: The password for `MYSQL_USER`.
* `MYSQL_DATABASE`: This service's database.

## Setting up a Database for the Service

As the initial database set up is a one-time activity, it is assumed that this activity is performed by a human manually. The following are the MySQL commands we would typically use to set up a database with the default credentials:

Note: Requires MySQL 5.7

```sh
$ mysql -u root
```

```sql
> CREATE DATABASE skeleton_app;
> CREATE DATABASE skeleton_app_test;
> CREATE USER 'sangoma'@'%' IDENTIFIED BY 'sangomaftw!';
> GRANT ALL PRIVILEGES ON skeleton_app.* to 'sangoma'@'%';
> GRANT ALL PRIVILEGES ON skeleton_app_test.* to 'sangoma'@'%';
```

## Database Migrations

The service should define all changes to its database in Knex migration files. A sample migration file has been provided that adds support for storing credentials HTTP Basic Authentication.

To run the migrations, define the environment variable `KNEX_RUN_MIGRATIONS` to some non-zero value when starting the service, or run the `migrate` / `migrate-test` npm scripts:

```
$ npm run migrate

> service-skeleton@0.0.1 migrate /service-skeleton
> knex migrate:latest

Using environment: development
Batch 1 run: 1 migrations
20190117125502_app_credentials.js
```

### Creating Migrations

From the root of the project execute the following command:

$ node_modules/knex/bin/cli.js migrate:make <migration namey> 

The above command would create a migration file which looks like following:

```
exports.up = function(knex, Promise) {

};

exports.down = function(knex, Promise) {

};
```

Inside each function up/down we need to create/modified or delete what ever we need, but every change done in 'up' must be reverted by 'down'

Example of creating a table by using knex parameter

```
knex.schema.createTable('zones', (table) =>{
	    table.string('id',128).primary();
	    table.string('name',64).notNullable();	    
	    table.string('accessToken',256).notNullable().unique();
	    table.string('location',128);
	    table.string('createdAt','DATETIME(6)').notNullable();
	    table.string('updatedAt','DATETIME(6)').notNullable();
	}).createTable('users',(table) =>{
	    table.string('id',128).primary();
	    table.string('href',256).notNullable();
	    table.string('createdAt','DATETIME(6)').notNullable();
	    table.string('updatedAt','DATETIME(6)').notNullable();
	});
```

## Bookshelf Models

This project uses [Bookshelf](https://bookshelfjs.org/) as its ORM, with some help from [JOI](https://github.com/hapijs/joi) for schema validation. An example of this approach can be seen in the [AppCredentials](./src/models/AppCredentials.js) model.

# Swagger API

This project makes heavy use of [Swagger](https://swagger.io/) and [Swagger-Expresss Middleware](https://github.com/APIDevTools/swagger-express-middleware) to define and provide its REST API. The benefits of using Swagger / OpenAPI are beyond the scope of this ReadME; it is highly encouraged for the reader to become familiar with the OpenAPI specification and the tooling Swagger provides around it.

This project supports using the [`swagger` CLI](https://github.com/APIDevTools/swagger-cli) tools and [Swagger UI](https://github.com/swagger-api/swagger-ui) to build and test the API.

## Swagger CLI

To use the Swagger CLI tools and its interactive development environment, install the tools globally:

```
$ npm install -g swagger-cli
```

Because we place the Swagger code structure under `src/`, NPM scripts have been provided to direct `swagger-cli` to the appropriate root directory structure.

### Starting the Service in Swagger Interactive Mode

```
$ npm run swagger-start
```

### API Editing in Interactive Mode

```
$ npm run swagger-edit
```

### API Validation

```
$ npm run swagger-validate
```

## Swagger UI

This project delivers the Swagger UI configured to load this project's API documentation. The Swagger UI can be accessed at http://localhost:3000/docs; the Swagger documentation for the project can be accessed at http://localhost:3000/api-docs.

*NOTE*: If you would like to restrict access to the service documentation, edit the [Swagger middleware](./src/lib/middleware/swagger.js) to authenticate or somehow restrict requests accessing the documentation.

