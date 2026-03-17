import { mount } from '@pyreon/runtime-dom'
import { App } from './App'
import './style.css'

const container = document.getElementById('app')
if (!container) throw new Error('Missing #app element')

mount(<App />, container)
