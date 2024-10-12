import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg';
import axios from 'axios';
import './App.css'

function App() {
  const [jokes, setJokes] = useState([]);
  useEffect(()=>{
    axios.get('http://localhost:3000/jokes')
    .then((res)=>{
      setJokes(res.data)
    })
    .catch((err)=>{
      console.log(err)
    })
  })

  return (
    <>
      <h1>Hello World</h1>
      <p>Jokes: {jokes.length}</p>
      {
        jokes.map((joke)=>{
          <div key={joke.id} className="">
            <h3>{joke.title}</h3>
            <p>{joke.content}</p>
          </div>
        })
      }
    </>
  )
}

export default App
