import express from 'express'
import hotelsModule from '../modules/hotels/controller/hotels_controller.js'
const app = express()

app.use('/hotels', hotelsModule)

export default app
