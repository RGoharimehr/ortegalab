'use strict';

// Register feature routers in one place; every module retains the existing URLs.
const routers = [
  require('./auth').createAuthRouter,
  require('./content').createContentRouter,
  require('./white-papers').createWhitePapersRouter,
  require('./uploads').createUploadsRouter,
  require('./media').createMediaRouter,
  require('./schedule').createScheduleRouter,
  require('./tasks').createTasksRouter,
  require('./inventory').createInventoryRouter,
  require('./settings').createSettingsRouter,
  require('./projects').createProjectsRouter,
  require('./accounts').createAccountsRouter,
  require('./equipment').createEquipmentRouter,
  require('./samples').createSamplesRouter,
  require('./notebooks').createNotebooksRouter,
  require('./training').createTrainingRouter,
  require('./resources').createResourcesRouter,
  require('./issues').createIssuesRouter,
  require('./documents').createDocumentsRouter,
  require('./system').createSystemRouter,
];

function registerRoutes(app, dependencies) {
  for (const createRouter of routers) app.use(createRouter(dependencies));
}

module.exports = { registerRoutes };
