const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const slugify = require("slugify");
const Course = require("./Course");
const Chapter = require("../chapters/Chapter");
const Enterprise = require("../enterprises/Enterprise");
const Professor = require("../professors/Professor");
const muxVideo = require("../services/muxVideo");
const { authorize, canAccess, PERMISSIONS, ROLES } = require("../middleware/rbac");

const coursePanelAuth = authorize(PERMISSIONS.COURSE_PANEL, {
  loginPath: "/login",
});
const dashboardAuth = authorize(PERMISSIONS.AUTHENTICATED, {
  loginPath: "/login",
});

const COURSE_STATUSES = ["draft", "published", "archived"];
const CHAPTER_STATUSES = ["draft", "published"];
const DEFAULT_COURSE_CATEGORY = "General";
const MAX_ATTACHMENT_RESOURCES = 20;
const MAX_ATTACHMENT_DATA_URL_LENGTH = 9 * 1024 * 1024;
const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const DATA_URL_PATTERN = /^data:[^,]*;base64,[A-Za-z0-9+/=]+$/;
const FILE_NAME_PATTERN = /\.(pdf|docx?|pptx?|xlsx?|csv|txt|zip|jpe?g|png|gif|webp)$/i;

const normalizeText = (value) => (value || "").toString().trim();

const normalizeOptionalText = (value) => {
  const text = normalizeText(value);
  return text || null;
};

const truncateText = (value, maxLength) => normalizeText(value).slice(0, maxLength);

const normalizeCourseCategory = (value) =>
  truncateText(value, 80) || DEFAULT_COURSE_CATEGORY;

const toInteger = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toDecimal = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const normalizeStatus = (value, fallback = "draft") => {
  if (value === true || value === "true" || value === "1" || value === "on") {
    return "published";
  }

  if (value === false || value === "false" || value === "0") {
    return "draft";
  }

  const status = normalizeText(value).toLowerCase();
  return status || fallback;
};

const getCourseTitle = (course) => course?.title || course?.name || "Untitled course";
const getCourseWorkload = (course) => course?.workload_hours ?? course?.workload ?? 0;

const stripHtml = (value) =>
  (value || "")
    .toString()
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getCourseSlug = (title) =>
  slugify(title || "course", {
    lower: true,
    strict: true,
  });

const getAttachmentId = (value, index, type) => {
  const safeId = normalizeText(value)
    .replace(/[^a-z0-9_-]/gi, "")
    .slice(0, 64);

  return safeId || `${type}-${index + 1}`;
};

const getUrlWithProtocol = (value) => {
  const url = normalizeText(value);

  if (!url) return null;

  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  if (FILE_NAME_PATTERN.test(url) && !url.includes("/")) return null;
  if (!url.includes(".") && !url.toLowerCase().startsWith("www.")) return null;

  return `https://${url}`;
};

const normalizeExternalUrl = (value) => {
  const url = getUrlWithProtocol(value);

  if (!url) return null;

  try {
    const parsedUrl = new URL(url);
    return SAFE_LINK_PROTOCOLS.has(parsedUrl.protocol) ? parsedUrl.toString() : null;
  } catch (error) {
    return null;
  }
};

const normalizeAttachmentFileUrl = (value) => {
  const url = normalizeText(value);

  if (!url || url.length > MAX_ATTACHMENT_DATA_URL_LENGTH) return null;

  return DATA_URL_PATTERN.test(url) ? url : null;
};

const normalizeAttachmentResource = (resource, index) => {
  if (!resource) return null;

  if (typeof resource === "string") {
    const url = normalizeExternalUrl(resource);

    if (url) {
      return {
        id: getAttachmentId(resource, index, "link"),
        type: "link",
        title: truncateText(resource, 160),
        url,
      };
    }

    return {
      id: getAttachmentId(resource, index, "note"),
      type: "note",
      title: truncateText(resource, 160),
      text: truncateText(resource, 500),
    };
  }

  const type = normalizeText(resource.type).toLowerCase();

  if (type === "file") {
    const url = normalizeAttachmentFileUrl(resource.url || resource.dataUrl || resource.href);

    if (!url) return null;

    const fileName = truncateText(
      resource.fileName || resource.filename || resource.name || resource.title || "course-file",
      180,
    );
    const title = truncateText(resource.title || fileName, 160);
    const mimeType = truncateText(resource.mimeType || resource.contentType || "", 100);
    const size = Math.max(0, toInteger(resource.size, 0));

    return {
      id: getAttachmentId(resource.id || fileName, index, "file"),
      type: "file",
      title,
      fileName,
      mimeType,
      size,
      url,
    };
  }

  if (type === "note") {
    const text = truncateText(resource.text || resource.title || "", 500);

    if (!text) return null;

    return {
      id: getAttachmentId(resource.id || text, index, "note"),
      type: "note",
      title: truncateText(resource.title || text, 160),
      text,
    };
  }

  const url = normalizeExternalUrl(resource.url || resource.href);

  if (!url) return null;

  return {
    id: getAttachmentId(resource.id || url, index, "link"),
    type: "link",
    title: truncateText(resource.title || resource.name || url, 160),
    url,
  };
};

const parseLegacyAttachments = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean)
    .map((line, index) => normalizeAttachmentResource(line, index));

const normalizeAttachmentResources = (resources) =>
  resources
    .map((resource, index) => normalizeAttachmentResource(resource, index))
    .filter(Boolean)
    .slice(0, MAX_ATTACHMENT_RESOURCES);

const parseCourseAttachments = (value) => {
  const text = normalizeOptionalText(value);

  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    const resources = Array.isArray(parsed) ? parsed : [parsed];
    return normalizeAttachmentResources(resources);
  } catch (error) {
    return parseLegacyAttachments(text).slice(0, MAX_ATTACHMENT_RESOURCES);
  }
};

const normalizeAttachmentsInput = (value) => {
  const resources = parseCourseAttachments(value);
  return resources.length ? JSON.stringify(resources) : null;
};

const formatBytes = (size) => {
  const bytes = Number(size || 0);

  if (!bytes) return "";

  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

const decorateAttachmentResource = (resource) => {
  if (resource.type === "file") {
    return {
      ...resource,
      label: "File",
      meta: [formatBytes(resource.size), resource.mimeType].filter(Boolean).join(" - "),
    };
  }

  if (resource.type === "note") {
    return {
      ...resource,
      label: "Reference",
      meta: "Saved reference",
    };
  }

  return {
    ...resource,
    label: "Link",
    meta: resource.url,
  };
};

const decorateCourse = (course) => {
  const plain = typeof course.get === "function" ? course.get({ plain: true }) : course;
  const title = getCourseTitle(plain);
  const status = normalizeStatus(plain.status);
  const attachmentResources = parseCourseAttachments(plain.attachments);

  return {
    ...plain,
    title,
    name: plain.name || title,
    category: normalizeCourseCategory(plain.category),
    workload_hours: getCourseWorkload(plain),
    status,
    description_text: stripHtml(plain.description),
    chapters_count: plain.chapters?.length || 0,
    attachment_resources: attachmentResources.map(decorateAttachmentResource),
    attachments_count: attachmentResources.length,
  };
};

const findFirst = (model) =>
  model.findOne({
    order: [["id", "ASC"]],
  });

const getCourseOwnership = async (req) => {
  const sessionUser = req.session?.user;
  let enterprise_id = sessionUser?.enterprise_id || null;
  let professor_id = null;

  if (sessionUser?.profile === ROLES.PROFESSOR) {
    const professor = await Professor.findOne({
      where: { user_id: sessionUser.id },
    });
    professor_id = professor?.id || null;
  }

  if (!professor_id) {
    const professor = await findFirst(Professor);
    professor_id = professor?.id || null;
  }

  if (!enterprise_id) {
    const enterprise = await findFirst(Enterprise);
    enterprise_id = enterprise?.id || null;
  }

  return { enterprise_id, professor_id };
};

const buildCoursePayload = (body, options = {}) => {
  const title = normalizeText(body.title || body.name);
  const workloadHours = toInteger(body.workload_hours || body.workload, 0);
  const payload = {
    title,
    name: title,
    description: body.description || "",
    category: normalizeCourseCategory(body.category),
    workload_hours: workloadHours,
    workload: workloadHours,
    image: normalizeOptionalText(body.image),
    price: toDecimal(body.price, 0),
    slug: getCourseSlug(title),
    attachments: normalizeAttachmentsInput(body.attachments),
  };

  if (options.includeStatus) {
    payload.status = normalizeStatus(body.status, "draft");
  }

  if (options.ownership) {
    payload.enterprise_id = options.ownership.enterprise_id;
    payload.professor_id = options.ownership.professor_id;
  }

  return payload;
};

const buildChapterPayload = (body, options = {}) => {
  const payload = {
    title: normalizeText(body.title),
    description: body.description || "",
    video_provider: "mux",
    is_free_preview:
      body.is_free_preview === "on" ||
      body.is_free_preview === "true" ||
      body.is_free_preview === true,
  };

  if (options.includeStatus) {
    payload.status = normalizeStatus(body.status, "draft");
  }

  return payload;
};

const syncCourseFirstChapter = async (courseId) => {
  const firstChapter = await Chapter.findOne({
    where: { course_id: courseId },
    order: [
      ["position", "ASC"],
      ["id", "ASC"],
    ],
  });

  await Course.update(
    { chapter_id: firstChapter?.id || null },
    { where: { id: courseId } },
  );
};

const findCourseOrRedirect = async (id, res, redirectPath = "/teacher/courses") => {
  if (Number.isNaN(Number(id))) {
    res.redirect(redirectPath);
    return null;
  }

  const course = await Course.findByPk(id);

  if (!course) {
    res.redirect(redirectPath);
    return null;
  }

  return course;
};

const getScopedCourseWhere = (req, options = {}) => {
  const sessionUser = req.session?.user;
  const where = {};

  if (sessionUser?.profile !== ROLES.ADMIN && sessionUser?.enterprise_id) {
    where.enterprise_id = sessionUser.enterprise_id;
  }

  if (options.publishedOnly) {
    where.status = "published";
  }

  return where;
};

const getDashboardCourseWhere = (req) =>
  getScopedCourseWhere(req, {
    publishedOnly: !canAccess(req.session?.user, PERMISSIONS.COURSE_PANEL),
  });

const getDashboardFilters = (query) => ({
  q: normalizeText(query.q),
});

const applyDashboardFilters = (where, filters) => {
  const nextWhere = { ...where };

  if (filters.q) {
    nextWhere[Op.or] = [
      { title: { [Op.like]: `%${filters.q}%` } },
      { name: { [Op.like]: `%${filters.q}%` } },
      { description: { [Op.like]: `%${filters.q}%` } },
      { category: { [Op.like]: `%${filters.q}%` } },
    ];
  }

  return nextWhere;
};

const renderDashboard = async (req, res) => {
  const filters = getDashboardFilters(req.query);
  const baseWhere = getDashboardCourseWhere(req);
  const courses = await Course.findAll({
    where: applyDashboardFilters(baseWhere, filters),
    include: [{ model: Chapter, as: "chapters" }],
    order: [
      ["updated_at", "DESC"],
      ["id", "DESC"],
    ],
  });
  const decoratedCourses = courses.map(decorateCourse);

  return res.render("dashboard/index", {
    courses: decoratedCourses,
    filters,
    totalCourses: decoratedCourses.length,
    totalChapters: decoratedCourses.reduce(
      (sum, course) => sum + Number(course.chapters_count || 0),
      0,
    ),
    canManageCourses: canAccess(req.session?.user, PERMISSIONS.COURSE_PANEL),
  });
};

const renderCoursesIndex = async (req, res) => {
  const q = normalizeText(req.query.q);
  const status = normalizeText(req.query.status);
  const where = {};

  if (q) {
    where[Op.or] = [
      { title: { [Op.like]: `%${q}%` } },
      { name: { [Op.like]: `%${q}%` } },
      { description: { [Op.like]: `%${q}%` } },
      { category: { [Op.like]: `%${q}%` } },
    ];
  }

  if (status && COURSE_STATUSES.includes(status)) {
    where.status = status;
  }

  const courses = await Course.findAll({
    where,
    include: [{ model: Chapter, as: "chapters" }],
    order: [
      ["updated_at", "DESC"],
      ["id", "DESC"],
    ],
  });

  res.render("admin/courses/index", {
    courses: courses.map(decorateCourse),
    filters: { q, status },
    statusOptions: COURSE_STATUSES,
  });
};

router.get("/teacher/courses", coursePanelAuth, (req, res) => {
  renderCoursesIndex(req, res).catch((error) => {
    console.error(error);
    res.status(500).send("Erro ao buscar cursos");
  });
});

router.get("/dashboard", dashboardAuth, (req, res) => {
  renderDashboard(req, res).catch((error) => {
    console.error(error);
    res.status(500).send("Erro ao carregar dashboard");
  });
});

router.get("/admin/courses", coursePanelAuth, (req, res) => {
  renderCoursesIndex(req, res).catch((error) => {
    console.error(error);
    res.status(500).send("Erro ao buscar cursos");
  });
});

router.get("/admin/courses/new", coursePanelAuth, (req, res) => {
  res.redirect("/teacher/courses/new");
});

router.get("/teacher/courses/new", coursePanelAuth, (req, res) => {
  res.render("teacher/courses/new");
});

router.post("/teacher/courses", coursePanelAuth, async (req, res) => {
  try {
    const ownership = await getCourseOwnership(req);
    const payload = buildCoursePayload(req.body, {
      includeStatus: true,
      ownership,
    });

    if (!payload.title) {
      return res.redirect("/teacher/courses/new");
    }

    const course = await Course.create(payload);
    return res.redirect(`/teacher/courses/${course.id}/edit`);
  } catch (error) {
    console.error(error);
    return res.redirect("/teacher/courses/new");
  }
});

router.post("/courses/save", coursePanelAuth, async (req, res) => {
  try {
    const ownership = await getCourseOwnership(req);
    const payload = buildCoursePayload(req.body, {
      includeStatus: true,
      ownership,
    });

    if (!payload.title) {
      return res.redirect("/teacher/courses/new");
    }

    const course = await Course.create(payload);
    return res.redirect(`/teacher/courses/${course.id}/edit`);
  } catch (error) {
    console.error(error);
    return res.redirect("/teacher/courses/new");
  }
});

router.get("/admin/courses/edit/:id", coursePanelAuth, (req, res) => {
  res.redirect(`/teacher/courses/${req.params.id}/edit`);
});

router.get("/teacher/courses/:id/edit", coursePanelAuth, async (req, res) => {
  try {
    const course = await findCourseOrRedirect(req.params.id, res);
    if (!course) return;

    const chapters = await Chapter.findAll({
      where: { course_id: course.id },
      order: [
        ["position", "ASC"],
        ["id", "ASC"],
      ],
    });

    return res.render("teacher/courses/edit", {
      course: decorateCourse(course),
      chapters,
      statusOptions: COURSE_STATUSES,
      chapterStatuses: CHAPTER_STATUSES,
    });
  } catch (error) {
    console.error(error);
    return res.redirect("/teacher/courses");
  }
});

router.get("/courses/:id", dashboardAuth, async (req, res) => {
  const id = req.params.id;

  if (Number.isNaN(Number(id))) {
    return res.status(404).send("Curso nao encontrado");
  }

  try {
    const courseWhere = {
      ...getDashboardCourseWhere(req),
      id,
    };
    const [course, chapters] = await Promise.all([
      Course.findOne({ where: courseWhere }),
      Chapter.findAll({
        where: { course_id: id },
        order: [
          ["position", "ASC"],
          ["id", "ASC"],
        ],
      }),
    ]);

    if (!course) {
      return res.status(404).send("Curso nao encontrado");
    }

    const canPreviewDraft = canAccess(req.session?.user, PERMISSIONS.COURSE_PANEL);

    const visibleChapters = canPreviewDraft
      ? chapters
      : chapters.filter((chapter) => normalizeStatus(chapter.status) === "published");

    return res.render("courses/show", {
      course: decorateCourse(course),
      chapters: visibleChapters,
      canPreviewDraft,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send("Erro ao carregar curso");
  }
});

router.post("/teacher/courses/:id/update", coursePanelAuth, async (req, res) => {
  const id = req.params.id;

  try {
    const course = await findCourseOrRedirect(id, res);
    if (!course) return;

    const payload = buildCoursePayload(req.body);

    if (!payload.title) {
      return res.redirect(`/teacher/courses/${id}/edit`);
    }

    await Course.update(payload, { where: { id } });
    return res.redirect(`/teacher/courses/${id}/edit`);
  } catch (error) {
    console.error(error);
    return res.redirect(`/teacher/courses/${id}/edit`);
  }
});

router.post("/courses/update", coursePanelAuth, async (req, res) => {
  const id = req.body.id;

  try {
    const course = await findCourseOrRedirect(id, res, "/teacher/courses");
    if (!course) return;

    const payload = buildCoursePayload(req.body, { includeStatus: true });

    if (!payload.title) {
      return res.redirect(`/teacher/courses/${id}/edit`);
    }

    await Course.update(payload, { where: { id } });
    return res.redirect(`/teacher/courses/${id}/edit`);
  } catch (error) {
    console.error(error);
    return res.redirect(`/teacher/courses/${id}/edit`);
  }
});

router.post("/teacher/courses/:id/status", coursePanelAuth, async (req, res) => {
  const id = req.params.id;

  try {
    const status = normalizeStatus(req.body.status, "draft");

    if (!COURSE_STATUSES.includes(status)) {
      return res.redirect(`/teacher/courses/${id}/edit`);
    }

    await Course.update({ status }, { where: { id } });
    return res.redirect(`/teacher/courses/${id}/edit`);
  } catch (error) {
    console.error(error);
    return res.redirect(`/teacher/courses/${id}/edit`);
  }
});

router.post("/courses/delete", coursePanelAuth, async (req, res) => {
  const id = req.body.id;

  if (!id || Number.isNaN(Number(id))) {
    return res.redirect("/teacher/courses");
  }

  try {
    await Chapter.destroy({ where: { course_id: id } });
    await Course.destroy({ where: { id } });
    return res.redirect("/teacher/courses");
  } catch (error) {
    console.error(error);
    return res.redirect("/teacher/courses");
  }
});

router.post("/teacher/courses/:courseId/chapters", coursePanelAuth, async (req, res) => {
  const courseId = req.params.courseId;

  try {
    const course = await findCourseOrRedirect(courseId, res);
    if (!course) return;

    const chapterCount = await Chapter.count({ where: { course_id: courseId } });
    const chapter = await Chapter.create({
      course_id: courseId,
      title: `Chapter ${chapterCount + 1}`,
      description: "",
      position: chapterCount + 1,
      status: "draft",
    });

    if (!course.chapter_id) {
      await Course.update({ chapter_id: chapter.id }, { where: { id: courseId } });
    }

    return res.redirect(`/teacher/courses/${courseId}/chapters/${chapter.id}/edit`);
  } catch (error) {
    console.error(error);
    return res.redirect(`/teacher/courses/${courseId}/edit`);
  }
});

router.post("/teacher/courses/:courseId/chapters/reorder", coursePanelAuth, async (req, res) => {
  const courseId = req.params.courseId;
  const order = Array.isArray(req.body.order) ? req.body.order : [];

  try {
    await Promise.all(
      order.map((chapterId, index) =>
        Chapter.update(
          { position: index + 1 },
          {
            where: {
              id: chapterId,
              course_id: courseId,
            },
          },
        ),
      ),
    );
    await syncCourseFirstChapter(courseId);
    return res.json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false });
  }
});

router.get(
  "/teacher/courses/:courseId/chapters/:chapterId/edit",
  coursePanelAuth,
  async (req, res) => {
    const { courseId, chapterId } = req.params;

    try {
      const [course, chapter] = await Promise.all([
        Course.findByPk(courseId),
        Chapter.findOne({ where: { id: chapterId, course_id: courseId } }),
      ]);

      if (!course || !chapter) {
        return res.redirect(`/teacher/courses/${courseId}/edit`);
      }

      return res.render("teacher/chapters/edit", {
        course: decorateCourse(course),
        chapter,
        statusOptions: CHAPTER_STATUSES,
      });
    } catch (error) {
      console.error(error);
      return res.redirect(`/teacher/courses/${courseId}/edit`);
    }
  },
);

router.get("/teacher/chapters/:chapterId/edit", coursePanelAuth, async (req, res) => {
  try {
    const chapter = await Chapter.findByPk(req.params.chapterId);

    if (!chapter) {
      return res.redirect("/teacher/courses");
    }

    return res.redirect(`/teacher/courses/${chapter.course_id}/chapters/${chapter.id}/edit`);
  } catch (error) {
    console.error(error);
    return res.redirect("/teacher/courses");
  }
});

router.post(
  "/teacher/courses/:courseId/chapters/:chapterId/update",
  coursePanelAuth,
  async (req, res) => {
    const { courseId, chapterId } = req.params;

    try {
      const payload = buildChapterPayload(req.body);

      if (!payload.title) {
        return res.redirect(`/teacher/courses/${courseId}/chapters/${chapterId}/edit`);
      }

      await Chapter.update(payload, {
        where: {
          id: chapterId,
          course_id: courseId,
        },
      });

      return res.redirect(`/teacher/courses/${courseId}/chapters/${chapterId}/edit`);
    } catch (error) {
      console.error(error);
      return res.redirect(`/teacher/courses/${courseId}/chapters/${chapterId}/edit`);
    }
  },
);

router.post(
  "/teacher/courses/:courseId/chapters/:chapterId/mux-upload",
  coursePanelAuth,
  async (req, res) => {
    const { courseId, chapterId } = req.params;

    try {
      const chapter = await Chapter.findOne({
        where: {
          id: chapterId,
          course_id: courseId,
        },
      });

      if (!chapter) {
        return res.status(404).json({
          ok: false,
          error: "Chapter not found.",
        });
      }

      const upload = await muxVideo.createDirectUpload({ req, chapter });

      await Chapter.update(
        {
          video_provider: "mux",
          video_url: null,
          mux_upload_id: upload.id,
          mux_upload_status: upload.status,
          mux_asset_id: null,
          mux_playback_id: null,
          mux_error: null,
        },
        {
          where: {
            id: chapterId,
            course_id: courseId,
          },
        },
      );

      return res.json({
        ok: true,
        url: upload.url,
        upload_id: upload.id,
        upload_status: upload.status,
        status_url: `/teacher/courses/${courseId}/chapters/${chapterId}/mux-status`,
      });
    } catch (error) {
      console.error(error);
      const message =
        error.code === "MUX_NOT_CONFIGURED"
          ? error.message
          : "Could not create the Mux upload.";

      return res.status(500).json({
        ok: false,
        error: message,
      });
    }
  },
);

router.get(
  "/teacher/courses/:courseId/chapters/:chapterId/mux-status",
  coursePanelAuth,
  async (req, res) => {
    const { courseId, chapterId } = req.params;

    try {
      const chapter = await Chapter.findOne({
        where: {
          id: chapterId,
          course_id: courseId,
        },
      });

      if (!chapter) {
        return res.status(404).json({
          ok: false,
          error: "Chapter not found.",
        });
      }

      if (!chapter.mux_upload_id) {
        return res.json({
          ok: true,
          upload_status: chapter.mux_upload_status || null,
          asset_status: null,
          playback_id: chapter.mux_playback_id || null,
          mux_error: chapter.mux_error || null,
        });
      }

      const { upload, asset, playbackId } = await muxVideo.getUploadStatus(
        chapter.mux_upload_id,
      );
      const nextValues = {
        mux_upload_status: upload.status,
        mux_asset_id: upload.asset_id || chapter.mux_asset_id,
        mux_playback_id: playbackId || chapter.mux_playback_id,
        mux_error: upload.error?.message || asset?.errors?.messages?.join(" ") || null,
      };

      await Chapter.update(nextValues, {
        where: {
          id: chapterId,
          course_id: courseId,
        },
      });

      return res.json({
        ok: true,
        upload_status: upload.status,
        asset_status: asset?.status || null,
        playback_id: nextValues.mux_playback_id,
        mux_error: nextValues.mux_error,
      });
    } catch (error) {
      console.error(error);
      const message =
        error.code === "MUX_NOT_CONFIGURED"
          ? error.message
          : "Could not read the Mux upload status.";

      return res.status(500).json({
        ok: false,
        error: message,
      });
    }
  },
);

router.post(
  "/teacher/courses/:courseId/chapters/:chapterId/status",
  coursePanelAuth,
  async (req, res) => {
    const { courseId, chapterId } = req.params;

    try {
      const status = normalizeStatus(req.body.status, "draft");

      if (!CHAPTER_STATUSES.includes(status)) {
        return res.redirect(`/teacher/courses/${courseId}/chapters/${chapterId}/edit`);
      }

      await Chapter.update(
        { status },
        {
          where: {
            id: chapterId,
            course_id: courseId,
          },
        },
      );

      return res.redirect(`/teacher/courses/${courseId}/chapters/${chapterId}/edit`);
    } catch (error) {
      console.error(error);
      return res.redirect(`/teacher/courses/${courseId}/chapters/${chapterId}/edit`);
    }
  },
);

router.post(
  "/teacher/courses/:courseId/chapters/:chapterId/delete",
  coursePanelAuth,
  async (req, res) => {
    const { courseId, chapterId } = req.params;

    try {
      await Chapter.destroy({
        where: {
          id: chapterId,
          course_id: courseId,
        },
      });
      await syncCourseFirstChapter(courseId);
      return res.redirect(`/teacher/courses/${courseId}/edit`);
    } catch (error) {
      console.error(error);
      return res.redirect(`/teacher/courses/${courseId}/chapters/${chapterId}/edit`);
    }
  },
);

module.exports = router;
