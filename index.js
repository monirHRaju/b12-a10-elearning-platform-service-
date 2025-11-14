const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 3000
const admin = require("firebase-admin");


const decoded = Buffer.from(process.env.FIREBASE_SERVICE_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


//middleware
app.use(cors())
app.use(express.json())
const verifyFirebaseToken = async (req, res, next) => {
  const authorization = req.headers.authorization

  if(!authorization){
    return res.status(401).send({message: 'unauthorized access'})
  }

  const token = authorization.split(" ")[1]

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    // console.log('inside token', decoded)
    req.token_email = decoded.email;

    next()
  }
  catch {
    return res.status(401).send({message: 'Unauthorized access'})
  }

}



app.get('/', (req, res) => {
    res.send('Smart server is running')
})

  
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w1zimwj.mongodb.net/?appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const db = client.db("eLearning_db")
    const courseCollection = db.collection("courses")
    const usersCollection = db.collection("users")
    const enrollsCollection = db.collection("enrolls")
    
    // user api's here
    app.post('/users', async (req, res) => {
        const newUser = req.body;
        // console.log(newUser)
        const email = req.body.email;
        const query = { email: email }
        const existingUser = await usersCollection.findOne(query);

        if (existingUser) {
            res.send({ message: 'user already exits. do not need to insert again' })
        }
        else {
            const result = await usersCollection.insertOne(newUser);
            res.send(result);
        }
    })
    //Courses API here
    //get all courses
    app.get('/courses', async (req, res) => {

        const cursor = courseCollection.find()
        const result = await cursor.toArray()

        res.send(result)
    })
    
    //get my courses
    app.get('/my-courses', verifyFirebaseToken, async (req, res) => {

        const email = req.query.email;
        const query = {}
        if(email) {
          query.email = email;
        }
        const cursor = courseCollection.find(query)
        const result = await cursor.toArray()

        res.send(result)
    })

    //enroll a course and insert in database
    app.post("/enroll", async (req, res)=> {
      const enrollData = req.body
      const result = await enrollsCollection.insertOne(enrollData)
      res.send(result)
    })
    
    //my enrolled delete
    app.delete("/enroll/:id", async (req, res)=> {
      const deleteEnrollData = req.body
      const result = await enrollsCollection.deleteOne(enrollData)
      res.send(result)
    })
    app.patch('/courses/:id', async (req, res) => {
        const id = req.params.id;
        const updatedCourse = req.body;
        const query = { _id: new ObjectId(id) }
        const update = {
            $set: {
                title: updatedCourse.title,
                image: updatedCourse.image,
                price: updatedCourse.price,
                duration: updatedCourse.duration,
                category: updatedCourse.category,
                description: updatedCourse.description,
                isFeatured: updatedCourse.isFeatured,
                instructor_id: updatedCourse.instructor_id,
                instructor_name: updatedCourse.instructor_name,
                email: updatedCourse.email,
                photo: updatedCourse.photo,
                difficulty_level: updatedCourse.difficulty_level,
                rating: updatedCourse.rating,
                students: updatedCourse.students
            }
        }

        const result = await courseCollection.updateOne(query, update)
        res.send(result)
    })

    app.delete('/courses/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await courseCollection.deleteOne(query);
        res.send(result);
    })

    //get my enrolled courses
    app.get('/my-enrolls', verifyFirebaseToken, async (req, res) => {

        const email = req.query.email;
        const query = {}
        if(email) {
          query.enrolled_by = email;
        }
        const cursor = enrollsCollection.find(query)
        const result = await cursor.toArray()

        res.send(result)
    })

    //create new course
    app.post('/courses', verifyFirebaseToken, async (req, res) => {
      // console.log('headers in the post', req.headers)
        const newCourse = req.body;
        
        const result = await courseCollection.insertOne(newCourse);
            res.send(result);
      
       
    })

    //get featured course
    app.get('/featured-courses', async (req, res) => {
        // const projectData = {_id: 1, title: 1, duration: 1, category: 1, image: 1, price: 1, isFeatured: 1} 
        const cursor = courseCollection.find({isFeatured: true}).limit(6)
        const result = await cursor.toArray()

        res.send(result)
    })

    //get single course
    app.get('/courses/:id', async(req, res) => {
      const id = req.params.id
      console.log(id)
      const query = {_id: new ObjectId(id)}
      console.log(query)
      const cursor = courseCollection.find(query)
      const result = await cursor.toArray()
      res.send(result)
    })

  } finally {
    // Ensures that the client will close when you finish/error
    
  }
}
run().catch(console.dir);





app.listen(port, () => {
    console.log(`Server is running on port: ${port}`)
})
