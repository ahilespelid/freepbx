
const config = require('config');
const Group = require('../src/models/Group.js');
const Scene = require('../src/models/Scene.js');

exports.up = function(knex, Promise) {
	return new Promise((resolve,reject)=>{
		var q = require('q');
		var promises = [];
		Scene.fetchAll({withRelated: ['groups']}).then((scenes)=>{
			scenes.forEach((scene)=>{
				var _scene = scene.toJSON();
				var sceneActions = scene.get("actions") ? JSON.parse(scene.get("actions") ) : [];
				_scene.groups.forEach((group)=>{
					let groupActions = group.actions ? JSON.parse(group.actions) : [];
					groupActions.forEach((act)=>{
						sceneActions.push(act)
					})
				})
				scene.set("actions", JSON.stringify(sceneActions));
				promises.push(scene.save());
			})
			q.all(promises).then(()=>{
				resolve()
		
			})
		})
	})
};

exports.down = function(knex, Promise) {
  return Promise;
};
