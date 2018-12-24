const express = require('express');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const {generateMessage, generateLocationMessage} = require('./../utils/message');
const {isRealString} = require('./../utils/validation');
const {Users} = require('./../utils/users');

var app = express();

var server = http.createServer(app);
var io = socketIO(server);
var users = new Users();

app.use(express.static(path.join(__dirname, '../public')));

io.on('connection', (socket) => {
	console.log('New user connected');

	socket.on('join', (params, callback) => {
		if(!isRealString(params.name) || !isRealString(params.room)){
			return callback('Name and room name are required');
		}

		socket.join(params.room);

		users.removeUser(socket.id);
		users.addUser(socket.id, params.name, params.room);
		io.to(params.room).emit('updateUserList', users.getUserList(params.room));		
		socket.emit('newMessage', generateMessage('Admin', 'Welcome to the chat app!'));
		socket.broadcast.to(params.room).emit('newMessage', generateMessage('Admin', `${params.name} joined`));
		callback();
	});

	socket.on('createMessage', (message, callback) => {

		var user = users.getUser(socket.id);
		if (user && isRealString(message)){
			io.to(user.room).emit('newMessage', generateMessage(user.name, message));	
		}
		callback();
	});

	socket.on('createLocationMessage', (coords) => {
		var user = users.getUser(socket.id);
		if (user){
			io.to(user.room).emit('newLocationMessage', generateLocationMessage(user.name, coords.longitude, coords.latitude));
		}
	});

	socket.on('disconnect', () => {
		var user = users.removeUser(socket.id);

		if (user){
			io.to(user.room).emit('updateUserList', users.getUserList(user.room));
			io.to(user.room).emit('newMessage', generateMessage('Admin', `${user.name} has left`));
		}
		console.log('User disconnected');
	});
});

server.listen(3000, () => {
	console.log('Server started at port 3000');
});