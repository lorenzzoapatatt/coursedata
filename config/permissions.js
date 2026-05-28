/**
 * Definição de todas as permissões do sistema
 * Formato: "recurso:acao"
 *
 * Estrutura:
 * - ALUNO: pode ver cursos e fazer matrícula
 * - PROFESSOR: pode criar aulas, ver alunos
 * - ENTERPRISE: pode gerenciar professores/alunos
 * - ADMIN: pode tudo
 */

const PERMISSIONS = {
  // Permissões de Cursos
  COURSE_VIEW: "course:view", // Ver lista de cursos
  COURSE_CREATE: "course:create", // Criar novo curso
  COURSE_EDIT: "course:edit", // Editar curso
  COURSE_DELETE: "course:delete", // Deletar curso

  // Permissões de Aulas
  LESSON_VIEW: "lesson:view", // Ver aulas
  LESSON_CREATE: "lesson:create", // Criar aula
  LESSON_EDIT: "lesson:edit", // Editar aula
  LESSON_DELETE: "lesson:delete", // Deletar aula

  // Permissões de Alunos
  STUDENT_VIEW: "student:view", // Ver lista de alunos
  STUDENT_CREATE: "student:create", // Adicionar aluno
  STUDENT_EDIT: "student:edit", // Editar aluno
  STUDENT_DELETE: "student:delete", // Remover aluno

  // Permissões de Professores
  TEACHER_VIEW: "teacher:view", // Ver lista de professores
  TEACHER_CREATE: "teacher:create", // Adicionar professor
  TEACHER_EDIT: "teacher:edit", // Editar professor
  TEACHER_DELETE: "teacher:delete", // Remover professor

  // Permissões de Matrículas
  ENROLLMENT_CREATE: "enrollment:create", // Fazer matrícula em curso
  ENROLLMENT_VIEW: "enrollment:view", // Ver matrículas
  ENROLLMENT_DELETE: "enrollment:delete", // Cancelar matrícula

  // Permissões de Admin
  ADMIN_PANEL: "admin:panel", // Acessar painel admin
  USER_MANAGE: "user:manage", // Gerenciar usuários
  ROLE_MANAGE: "role:manage", // Gerenciar roles/permissões
};

/**
 * Mapeamento de Roles para Permissões
 */
const ROLE_PERMISSIONS = {
  admin: [
    // Admin tem todas as permissões
    Object.values(PERMISSIONS),
  ],

  professor: [
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.LESSON_CREATE,
    PERMISSIONS.LESSON_EDIT,
    PERMISSIONS.LESSON_DELETE,
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.ENROLLMENT_VIEW,
  ],

  aluno: [
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.LESSON_VIEW,
    PERMISSIONS.ENROLLMENT_CREATE,
    PERMISSIONS.ENROLLMENT_VIEW,
  ],

  enterprise: [
    PERMISSIONS.COURSE_VIEW,
    PERMISSIONS.COURSE_CREATE,
    PERMISSIONS.COURSE_EDIT,
    PERMISSIONS.COURSE_DELETE,
    PERMISSIONS.LESSON_VIEW,
    PERMISSIONS.STUDENT_VIEW,
    PERMISSIONS.STUDENT_CREATE,
    PERMISSIONS.STUDENT_EDIT,
    PERMISSIONS.STUDENT_DELETE,
    PERMISSIONS.TEACHER_VIEW,
    PERMISSIONS.TEACHER_CREATE,
    PERMISSIONS.TEACHER_EDIT,
    PERMISSIONS.TEACHER_DELETE,
    PERMISSIONS.ENROLLMENT_VIEW,
  ],
};

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
};
