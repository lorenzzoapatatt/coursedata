# Course Builder Flow

Este documento explica a repaginacao da criacao de cursos.

## O que mudou

O fluxo do professor agora tem tres telas principais:

1. Course table: `/teacher/courses`
2. Name your course: `/teacher/courses/new`
3. Course setup: `/teacher/courses/:id/edit`
4. Chapter creation: `/teacher/courses/:courseId/chapters/:chapterId/edit`

As rotas antigas de admin continuam existindo, mas a edicao redireciona para o novo builder:

- `/admin/courses` renderiza a nova tabela.
- `/admin/courses/new` redireciona para `/teacher/courses/new`.
- `/admin/courses/edit/:id` redireciona para `/teacher/courses/:id/edit`.

## Tabela courses

O model fica em `courses/Course.js`.

Colunas principais:

- `id`
- `enterprise_id`
- `professor_id`
- `title`
- `description`
- `workload_hours`
- `image`
- `chapter_id`
- `price`
- `status`
- `slug`
- `attachments`
- `created_at`
- `updated_at`

As colunas antigas `name` e `workload` foram mantidas por compatibilidade. Quando um curso e criado ou editado, o controller sincroniza `title -> name` e `workload_hours -> workload`.

## Tabela chapters

O model fica em `chapters/Chapter.js`.

Colunas principais:

- `id`
- `course_id`
- `title`
- `description`
- `video_provider`
- `mux_upload_id`
- `mux_upload_status`
- `mux_asset_id`
- `mux_playback_id`
- `mux_error`
- `position`
- `is_free_preview`
- `status`
- `created_at`
- `updated_at`

`course_id` liga cada chapter ao curso. `position` controla a ordem que aparece para os students. A tela de setup permite arrastar os chapters, e a rota `/teacher/courses/:courseId/chapters/reorder` salva a nova ordem.

## Migracao automatica

O arquivo `database/ensureCourseSchema.js` roda no boot da aplicacao, depois do `connection.sync()`.

Ele:

- adiciona colunas novas na tabela `courses`;
- relaxa `enterprise_id` e `professor_id` para evitar erro em dados antigos;
- copia `name` para `title`;
- copia `workload` para `workload_hours`;
- converte status antigo booleano para `draft` ou `published`;
- cria `created_at` e `updated_at` quando a tabela antiga usava `createdAt` e `updatedAt`;
- deixa `createdAt` e `updatedAt` legados como opcionais, para inserts novos nao falharem.

## Rotas principais

Courses:

- `GET /teacher/courses`: tabela com filtro por texto/status.
- `GET /teacher/courses/new`: primeira etapa para nomear o curso.
- `POST /teacher/courses`: cria o curso e redireciona para o setup.
- `GET /teacher/courses/:id/edit`: edicao completa do curso.
- `POST /teacher/courses/:id/update`: salva dados do curso.
- `POST /teacher/courses/:id/status`: publica ou despublica o curso.
- `POST /courses/delete`: remove curso e chapters.

Chapters:

- `POST /teacher/courses/:courseId/chapters`: cria um chapter novo.
- `POST /teacher/courses/:courseId/chapters/reorder`: salva ordem arrastada.
- `GET /teacher/courses/:courseId/chapters/:chapterId/edit`: abre editor do chapter.
- `POST /teacher/courses/:courseId/chapters/:chapterId/update`: salva chapter.
- `POST /teacher/courses/:courseId/chapters/:chapterId/status`: publica ou despublica chapter.
- `POST /teacher/courses/:courseId/chapters/:chapterId/delete`: remove chapter.

## Editor rico

O arquivo `public/js/course-editor.js` usa Tiptap para as descricoes ricas:

- `@tiptap/core`
- `@tiptap/starter-kit`
- `@tiptap/extension-underline`
- `@tiptap/extension-link`

Como o projeto ainda nao tem bundler front-end, o browser carrega esses pacotes via ESM. As dependencias tambem estao no `package.json`, entao depois e facil mover isso para Vite/Webpack sem mudar a tela. Se a importacao remota falhar, ele usa um fallback `contenteditable` local para manter a tela funcionando.

## Video e Mux

O chapter agora usa Mux para upload e playback:

- backend: `@mux/mux-node`;
- upload drag-and-drop: `@mux/mux-uploader`;
- player do student/professor: `@mux/mux-player`.

A tela nao mostra provider, asset ID, playback ID ou duration seconds. O professor apenas arrasta um video do PC. O backend cria um Direct Upload na Mux, salva `mux_upload_id`, acompanha o processamento e salva `mux_asset_id`/`mux_playback_id` quando a Mux termina.

Configure estas variaveis antes de subir videos reais:

- `MUX_TOKEN_ID`
- `MUX_TOKEN_SECRET`
- `MUX_CORS_ORIGIN` opcional, por exemplo `http://localhost:8080`
- `MUX_UPLOAD_TIMEOUT_SECONDS` opcional, default `3600`

Sem `MUX_TOKEN_ID` e `MUX_TOKEN_SECRET`, a tela mostra erro em vez de ficar em loading infinito.

## Arquivos alterados

- `courses/Course.js`
- `chapters/Chapter.js`
- `courses/CourseController.js`
- `database/ensureCourseSchema.js`
- `database/ensureChapterSchema.js`
- `index.js`
- `middleware/rbac.js`
- `views/partials/sidebar.ejs`
- `views/index.ejs`
- `views/admin/courses/index.ejs`
- `views/teacher/courses/new.ejs`
- `views/teacher/courses/edit.ejs`
- `views/teacher/chapters/edit.ejs`
- `services/muxVideo.js`
- `public/js/course-editor.js`
- `public/css/app.css`
