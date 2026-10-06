import { mount } from 'svelte'
import './styles/screens.css'
import App from './App.svelte'
import { startFireflies } from './ui/fireflies'

const app = mount(App, {
  target: document.getElementById('app')!,
})

startFireflies()

export default app
