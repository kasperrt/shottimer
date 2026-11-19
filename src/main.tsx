import { render } from '@solidjs/web';
import { Router } from './router';

render(() => <Router />, document.getElementById('app') as HTMLElement);
