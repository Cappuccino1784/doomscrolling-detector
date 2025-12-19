import { createRoot } from 'react-dom/client';
import LiveScreen from './components/LiveScreen.jsx';

const App = () => {
    return (
        <div>
            <LiveScreen />
        </div>
    );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);