import { render } from '@solidjs/web';
import { countHostLanding } from './lib/analytics';
import { Router } from './router';

render(() => <Router />, document.getElementById('app') as HTMLElement);

countHostLanding(location);
