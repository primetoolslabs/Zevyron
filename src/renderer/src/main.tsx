import ReactDOM from "react-dom/client"
import App from "./App"
import ErrorBoundary from "./components/ErrorBoundary"
import { HashRouter } from "react-router-dom"
import { I18nProvider } from "./i18n"

const rootElement = document.getElementById("root")
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <I18nProvider>
      <HashRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </HashRouter>
    </I18nProvider>,
  )
}
