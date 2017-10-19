// When the app starts
var express=require('express');
var app = express();
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
// Bookshelf db configuration
var dbConfig={
	client:'mysql',
    connection:{
	 host:'localhost',
	 user:'root',
	 password:'password',
	 database:'foo',
	 charset:'utf8'
  }
};
var knex = require('knex')(dbConfig);
var bookshelf = require('bookshelf')(knex);


app.set('bookshelf', bookshelf);
app.set('view engine', 'ejs');


// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded());

// parse application/json
app.use(bodyParser.json());

// parse application/vnd.api+json as json
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
app.use(express.static('public'));
app.use(cookieParser());
app.use(session({secret: 'secretkey', saveUnitialized: true, resave: true, cookie: { maxAge: 24*360*1000}}))

// knex.schema.hasTable('todo-list').then(function(exists) {
// 	if (!exists) {
// 	  return knex.schema.createTable('todo-list', function(t) {
// 		t.increments('id').primary();
// 		t.string('task', 200);
// 		t.string('username').references('users.username');
// 		t.timestamps();
// 	  });
// 	}
//   });

var User = bookshelf.Model.extend({  
		tableName: 'users',
		hasTimestamps: true,
		todo: function() {
			return this.hasMany(Todo)
		},

		verifyPassword: function(password) {
			return this.get('password') === password;
		},
		isAdmin: function() {
			return this.get('role') === 'admin';
		},
	},
	{
		byEmail: function(email) {
			return this.forge().query({where:{ email: email }}).fetch();
		},
		byUsername: function(username) {
			return this.forge().query({where:{ username: username }}).fetch();
		}
	},

);

var Todo = bookshelf.Model.extend({
	tableName: 'todo-list',
	hasTimestamps: true,
	user: function() {
	  return this.belongsTo(User);
	},

  });

app.use(function(err, req, res, next){
  console.error(err.stack);
  res.send(500, 'Something broke!');
});

//USer data enter
app.get('/', function(req, res){
	if (req.session.page){
		res.render(req.session.page,{name: req.session.uname});
	}
	else{
		res.render('index', {message: null});
	}
});

app.get('/user_home', function(req, res) {
	var username = req.session.uname;
	Todo.forge().query({where:{ username: username }}).fetchAll().then(function(everyuser){
		var list = everyuser.toJSON();
		res.render('home', {list: list, username: username, name: req.session.name});
	})
});

app.post('/adduser', function(req, res){
	var data = {
		name: req.body.name,
		email: req.body.email,
		username: req.body.fusername,
		role: req.body.role,
		password: req.body.password
	};
	User.forge(data).save().then(function(user_data) {
		res.send(user_data.get('name'));
	}).catch(function(error){
		console.log(error);
		res.send('Error saving article');
	})
});
app.post('/addlist', function(req, res) {
	var data = {
		username: req.body.username,
		task: req.body.task
	};
	Todo.forge(data).save().then(function(user_data) {
		console.log(user_data);
		res.redirect('/user_home');
	});
});


// User login
app.post('/', function(req,res){
	var givenusername = req.body.username;
	var givenpassword = req.body.password;
		User.byUsername(givenusername).then(function(nuser) {
			if (nuser == null){
				res.render('index',{message: 'No user found!!!'});
			}
			else{
				if (nuser.verifyPassword(givenpassword)){
					if (nuser.isAdmin()) {
						req.session.uname = nuser.get('username');
						req.session.name = nuser.get('name');
						req.session.page = 'homepage';
						res.render('homepage');
						
					} else {
						req.session.uname = nuser.get('username');
						req.session.name = nuser.get('name');
						req.session.page = 'user_home';
						res.redirect('/user_home');
						
					}
				}
				else{
					res.render('index',{message: 'Authentication failed...'});
				}
			}	
		});
});

app.get('/view', function(req, res) {
	User.forge().fetchAll({columns: ['id', 'name', 'role']}).then(function(everyuser){
		var result = everyuser.toJSON();
		res.render('view', {result: result});
	})
});

app.post('/edit', function(req, res) {
	User.forge({id: req.body.id}).save({role: req.body.role});
	res.redirect('/view');
});

app.post('/delete', function(req, res) {
		User.forge({id: req.body.id}).destroy().then(function(model) {
		console.log(req.body.id);
	  	res.redirect('/view');
	});
});

app.post('/delete_task', function(req, res) {
	Todo.forge({ id: req.body.id }).fetch({ withRelated: ['user'] }).then(function (post) {
		if (!posts) {
		  return res.status(404).json({ error: true, message: 'post not found' })
		}
		// remove all the associations 
		post.tags().detach();
		// delete the post
		post.destroy();
		return res.json({ error: false, message: 'post deleted' });
	  }).catch(function (err) {
		res.status(500).json({ error: true, data: { message: err.message } });
	  });
	// Todo.forge({id: req.body.id}).destroy().then(function(model) {
	//   res.redirect('/user_home');
});
});


app.get('/signout', function(req, res){
	req.session.destroy();
	 res.redirect('/');
 });

 
 app.get('/new', function(req, res){
	 res.render('any');
 });
 app.post('/any', function(req, res){
    console.log(req.body.val2);
    res.send('fsdfsd');
});

app.listen(4000,function(){
	console.log("Express started at port 4000");
});