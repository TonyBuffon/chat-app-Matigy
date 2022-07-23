// NPM Modules
const path = require('path')
const http = require('http')
const express = require("express")
const socketio = require("socket.io")

// Importing Dev Modules
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, getUser, getUsersInRoom, removeUser } = require('./utils/users')

// Initializing App,Server & sockets
const app = express()
const server = http.createServer(app)
const io = socketio(server)

// creating the port const  
const port = process.env.PORT || 3000

// Serving static files
const publicDirectPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectPath))

// Controlling Events with Socket
io.on('connection', (socket) => {
    console.log("New WebSocket connection")
    // Message Events

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({
            id: socket.id,
            ...options
        })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage("Matigy", "Welcome!"))
        socket.broadcast.to(user.room).emit('message', generateMessage("Matigy", `${user.username} has joined the room!`))

        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()

    })
    // sending message Event
    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback('Delivered!')
    })
    // Sending Location Event  
    socket.on('sendLocation', (coords, cb) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        cb('Delivered!')
    })
    // Disconnection Event
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage("Matigy", `${user.username} has left`))

            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }

    })
})

// Server Start
server.listen(port, () => {
    console.log(`Server is up on port ${port}`)
})