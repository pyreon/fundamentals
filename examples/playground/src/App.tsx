import { signal } from '@pyreon/reactivity'
import { StoreDemo } from './demos/StoreDemo'
import { StateTreeDemo } from './demos/StateTreeDemo'
import { FormDemo } from './demos/FormDemo'
import { ValidationDemo } from './demos/ValidationDemo'
import { I18nDemo } from './demos/I18nDemo'
import { QueryDemo } from './demos/QueryDemo'
import { TableDemo } from './demos/TableDemo'
import { VirtualDemo } from './demos/VirtualDemo'
import { StorageDemo } from './demos/StorageDemo'
import { HotkeysDemo } from './demos/HotkeysDemo'
import { PermissionsDemo } from './demos/PermissionsDemo'
import { MachineDemo } from './demos/MachineDemo'

const tabs = [
  { id: 'store', label: 'Store', component: StoreDemo },
  { id: 'state-tree', label: 'State Tree', component: StateTreeDemo },
  { id: 'form', label: 'Form', component: FormDemo },
  { id: 'validation', label: 'Validation', component: ValidationDemo },
  { id: 'i18n', label: 'i18n', component: I18nDemo },
  { id: 'query', label: 'Query', component: QueryDemo },
  { id: 'table', label: 'Table', component: TableDemo },
  { id: 'virtual', label: 'Virtual', component: VirtualDemo },
  { id: 'storage', label: 'Storage', component: StorageDemo },
  { id: 'hotkeys', label: 'Hotkeys', component: HotkeysDemo },
  { id: 'permissions', label: 'Permissions', component: PermissionsDemo },
  { id: 'machine', label: 'Machine', component: MachineDemo },
] as const

const activeTab = signal(tabs[0]!.id)

export function App() {
  return (
    <div class="app">
      <nav class="sidebar">
        <h1>Pyreon Fundamentals</h1>
        <ul>
          {tabs.map((tab) => (
            <li key={tab.id}>
              <button
                class={activeTab() === tab.id ? 'active' : ''}
                onClick={() => activeTab.set(tab.id)}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main class="content">
        {() => {
          const tab = tabs.find((t) => t.id === activeTab())
          if (!tab) return null
          const Component = tab.component
          return <Component />
        }}
      </main>
    </div>
  )
}
