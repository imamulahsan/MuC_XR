import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { WorkspaceComponent } from './pages/workspace/workspace.component';

export const routes: Routes = [

  {
    path: '',
    component: HomeComponent
  },

  {
    path: 'workspace',
    component: WorkspaceComponent
  },

  {
    path: '**',
    redirectTo: ''
  }

];
