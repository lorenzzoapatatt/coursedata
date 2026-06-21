(function () {
  const MAX_INLINE_IMAGE_SIZE = 4 * 1024 * 1024;
  const MAX_ATTACHMENT_FILE_SIZE = 6 * 1024 * 1024;
  const MAX_ATTACHMENT_PAYLOAD_SIZE = 16 * 1024 * 1024;
  const TIPTAP_VERSION = "3.26.1";
  const SAFE_ATTACHMENT_PROTOCOLS = ["http:", "https:", "mailto:"];

  const getInputForEditor = (editorElement) => {
    const selector = editorElement.dataset.input;
    return selector ? document.querySelector(selector) : null;
  };

  const getToolbarForEditor = (editorElement) =>
    Array.from(document.querySelectorAll("[data-rich-toolbar]")).find(
      (toolbar) => toolbar.dataset.richToolbar === `#${editorElement.id}`,
    );

  const syncFallbackEditor = (editorElement, input) => {
    input.value = editorElement.innerHTML;
  };

  const runFallbackCommand = (command) => {
    const browserCommands = {
      paragraph: "formatBlock",
      bold: "bold",
      italic: "italic",
      underline: "underline",
      link: "createLink",
      orderedList: "insertOrderedList",
      bulletList: "insertUnorderedList",
      clearFormat: "removeFormat",
      undo: "undo",
    };

    if (command === "link") {
      const href = window.prompt("Paste the link URL");
      if (!href) return;
      document.execCommand(browserCommands[command], false, href);
      return;
    }

    if (command === "paragraph") {
      document.execCommand(browserCommands[command], false, "p");
      return;
    }

    document.execCommand(browserCommands[command] || command, false, null);
  };

  const initFallbackEditor = (editorElement, input) => {
    editorElement.contentEditable = "true";
    editorElement.innerHTML = input.value || "<p></p>";
    editorElement.addEventListener("input", () => syncFallbackEditor(editorElement, input));
    editorElement.closest("form")?.addEventListener("submit", () => {
      syncFallbackEditor(editorElement, input);
    });

    const toolbar = getToolbarForEditor(editorElement);
    toolbar?.querySelectorAll("[data-editor-command]").forEach((button) => {
      button.addEventListener("click", () => {
        editorElement.focus();
        runFallbackCommand(button.dataset.editorCommand);
        syncFallbackEditor(editorElement, input);
      });
    });
  };

  const loadTiptap = async () => {
    const [{ Editor }, starterKitModule, underlineModule, linkModule] = await Promise.all([
      import(`https://esm.sh/@tiptap/core@${TIPTAP_VERSION}`),
      import(`https://esm.sh/@tiptap/starter-kit@${TIPTAP_VERSION}`),
      import(`https://esm.sh/@tiptap/extension-underline@${TIPTAP_VERSION}`),
      import(`https://esm.sh/@tiptap/extension-link@${TIPTAP_VERSION}`),
    ]);

    return {
      Editor,
      StarterKit: starterKitModule.default,
      Underline: underlineModule.default,
      Link: linkModule.default,
    };
  };

  const runTiptapCommand = (editor, command) => {
    const commands = {
      paragraph: () => editor.chain().focus().setParagraph().run(),
      bold: () => editor.chain().focus().toggleBold().run(),
      italic: () => editor.chain().focus().toggleItalic().run(),
      underline: () => editor.chain().focus().toggleUnderline().run(),
      link: () => {
        const currentHref = editor.getAttributes("link").href || "";
        const href = window.prompt("Paste the link URL", currentHref);

        if (href === null) return false;

        if (href === "") {
          return editor.chain().focus().extendMarkRange("link").unsetLink().run();
        }

        return editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
      },
      orderedList: () => editor.chain().focus().toggleOrderedList().run(),
      bulletList: () => editor.chain().focus().toggleBulletList().run(),
      clearFormat: () => editor.chain().focus().unsetAllMarks().clearNodes().run(),
      undo: () => editor.chain().focus().undo().run(),
    };

    return (commands[command] || commands.bold)();
  };

  const initTiptapEditor = async (editorElement, input) => {
    const { Editor, StarterKit, Underline, Link } = await loadTiptap();
    const editor = new Editor({
      element: editorElement,
      extensions: [
        StarterKit,
        Underline,
        Link.configure({
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
        }),
      ],
      content: input.value || "<p></p>",
      onUpdate: ({ editor: activeEditor }) => {
        input.value = activeEditor.getHTML();
      },
    });

    editorElement.closest("form")?.addEventListener("submit", () => {
      input.value = editor.getHTML();
    });

    const toolbar = getToolbarForEditor(editorElement);
    toolbar?.querySelectorAll("[data-editor-command]").forEach((button) => {
      button.addEventListener("click", () => {
        runTiptapCommand(editor, button.dataset.editorCommand);
      });
    });
  };

  const initRichEditor = (editorElement) => {
    const input = getInputForEditor(editorElement);

    if (!input) return;

    initTiptapEditor(editorElement, input).catch(() => {
      initFallbackEditor(editorElement, input);
    });
  };

  const renderImagePreview = (previewElement, imageUrl) => {
    if (previewElement.tagName.toLowerCase() === "img") {
      previewElement.src = imageUrl;
      return;
    }

    const image = document.createElement("img");
    image.id = previewElement.id;
    image.src = imageUrl;
    image.alt = "Course image preview";
    previewElement.replaceWith(image);
  };

  const initImageInputs = () => {
    document.querySelectorAll("[data-image-input]").forEach((fileInput) => {
      fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        const valueInput = document.querySelector(fileInput.dataset.imageInput);
        const previewElement = document.querySelector(fileInput.dataset.imagePreview);

        if (!file || !valueInput || !previewElement) return;

        if (file.size > MAX_INLINE_IMAGE_SIZE) {
          alert("Choose an image smaller than 4MB.");
          fileInput.value = "";
          return;
        }

        const reader = new FileReader();
        reader.addEventListener("load", () => {
          valueInput.value = reader.result;
          renderImagePreview(previewElement, reader.result);
        });
        reader.readAsDataURL(file);
      });
    });
  };

  const initFocusButtons = () => {
    document.querySelectorAll("[data-focus-target]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = document.querySelector(button.dataset.focusTarget);
        target?.focus();
      });
    });
  };

  const getDragAfterElement = (container, y) => {
    const rows = [...container.querySelectorAll(".chapter-row:not(.dragging)")];

    return rows.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child };
        }

        return closest;
      },
      { offset: Number.NEGATIVE_INFINITY, element: null },
    ).element;
  };

  const persistChapterOrder = (list) => {
    const order = [...list.querySelectorAll(".chapter-row")].map(
      (row) => row.dataset.chapterId,
    );

    return fetch(list.dataset.reorderUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ order }),
    });
  };

  const initChapterReorder = () => {
    document.querySelectorAll(".chapter-list[data-reorder-url]").forEach((list) => {
      let draggedRow = null;

      list.querySelectorAll(".chapter-row").forEach((row) => {
        row.addEventListener("dragstart", () => {
          draggedRow = row;
          row.classList.add("dragging");
        });

        row.addEventListener("dragend", () => {
          row.classList.remove("dragging");
          persistChapterOrder(list).catch(() => {
            alert("Could not save the chapter order.");
          });
          draggedRow = null;
        });
      });

      list.addEventListener("dragover", (event) => {
        event.preventDefault();
        const afterElement = getDragAfterElement(list, event.clientY);

        if (!draggedRow) return;

        if (afterElement == null) {
          list.appendChild(draggedRow);
        } else {
          list.insertBefore(draggedRow, afterElement);
        }
      });
    });
  };

  const setMuxStatus = (card, message, isError) => {
    const statusElement = card.querySelector("[data-mux-status]");
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.classList.toggle("text-danger", Boolean(isError));
  };

  const escapeAttribute = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const renderMuxPlayer = (card, playbackId) => {
    const frame = card.querySelector("[data-mux-video-frame]");
    if (!frame) return;

    const title = document.querySelector("#chapter-title")?.value || "Chapter video";
    frame.innerHTML = [
      "<mux-player",
      ` playback-id="${escapeAttribute(playbackId)}"`,
      ` metadata-video-title="${escapeAttribute(title)}"`,
      ' accent-color="#0f6f85"',
      "></mux-player>",
    ].join("");
    card.dataset.playbackId = playbackId;
  };

  const pollMuxStatus = async (card, attempt) => {
    const statusUrl = card.dataset.statusUrl;
    if (!statusUrl) return;

    const currentAttempt = attempt || 0;

    try {
      const response = await fetch(statusUrl);
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not read the Mux status.");
      }

      if (data.playback_id) {
        renderMuxPlayer(card, data.playback_id);
        setMuxStatus(card, "Video ready for students.");
        return;
      }

      if (data.mux_error) {
        setMuxStatus(card, data.mux_error, true);
        return;
      }

      const status = data.asset_status || data.upload_status || "processing";
      setMuxStatus(card, `Mux is processing this video: ${status}.`);

      if (currentAttempt < 90) {
        window.setTimeout(() => pollMuxStatus(card, currentAttempt + 1), 4000);
      }
    } catch (error) {
      setMuxStatus(card, error.message, true);
    }
  };

  const initMuxUploaders = () => {
    document.querySelectorAll("[data-mux-upload-card]").forEach((card) => {
      const uploader = card.querySelector("mux-uploader");

      card.querySelector("[data-reset-mux-upload]")?.addEventListener("click", () => {
        const frame = card.querySelector("[data-mux-video-frame]");
        if (!frame) return;

        frame.innerHTML = [
          '<div class="mux-upload-box">',
          '<mux-uploader locale="en" type="bar" dynamic-chunk-size use-large-file-workaround></mux-uploader>',
          "</div>",
        ].join("");
        card.dataset.playbackId = "";
        window.setTimeout(initMuxUploaders, 0);
        setMuxStatus(card, "Choose files or drag and drop. Upload this chapter's video.");
      });

      if (card.dataset.playbackId) {
        return;
      }

      if (!uploader) {
        if (card.dataset.uploadStatus) {
          pollMuxStatus(card, 0);
        }
        return;
      }

      uploader.endpoint = async (file) => {
        setMuxStatus(card, `Preparing Mux upload for ${file.name}...`);

        const response = await fetch(card.dataset.uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: file.name,
            content_type: file.type,
            size: file.size,
          }),
        });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Could not create the Mux upload.");
        }

        card.dataset.statusUrl = data.status_url || card.dataset.statusUrl;
        setMuxStatus(card, "Uploading video to Mux...");
        return data.url;
      };

      uploader.addEventListener("progress", (event) => {
        setMuxStatus(card, `Uploading video to Mux: ${Math.round(event.detail)}%.`);
      });

      uploader.addEventListener("success", () => {
        setMuxStatus(card, "Upload complete. Mux is processing the video...");
        pollMuxStatus(card, 0);
      });

      uploader.addEventListener("uploaderror", (event) => {
        setMuxStatus(card, event.detail?.message || "Mux upload failed.", true);
      });
    });
  };

  const parseAttachmentResources = (value) => {
    if (!value) return [];

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (error) {
      return [];
    }
  };

  const createAttachmentId = (type) =>
    `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

  const getAttachmentTitle = (resource) =>
    resource.title || resource.fileName || resource.filename || resource.name || resource.url || "Resource";

  const getAttachmentMeta = (resource) => {
    if (resource.type === "file") {
      return [formatBytes(resource.size), resource.mimeType || resource.contentType]
        .filter(Boolean)
        .join(" - ");
    }

    if (resource.type === "note") {
      return resource.text || "Saved reference";
    }

    return resource.url || "External link";
  };

  const getAttachmentUrlWithProtocol = (value) => {
    const url = String(value || "").trim();

    if (!url) return "";

    return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
  };

  const normalizeAttachmentLink = (value) => {
    const url = getAttachmentUrlWithProtocol(value);

    try {
      const parsed = new URL(url);
      return SAFE_ATTACHMENT_PROTOCOLS.includes(parsed.protocol) ? parsed.toString() : "";
    } catch (error) {
      return "";
    }
  };

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result));
      reader.addEventListener("error", () => reject(reader.error));
      reader.readAsDataURL(file);
    });

  const canStoreAttachmentResource = (resources, nextResource) => {
    const nextValue = JSON.stringify([...resources, nextResource]);
    return nextValue.length <= MAX_ATTACHMENT_PAYLOAD_SIZE;
  };

  const syncAttachmentStore = (store, resources) => {
    store.value = JSON.stringify(resources);
  };

  const renderAttachmentList = (manager, resources, onRemove) => {
    const list = manager.querySelector("[data-attachment-list]");
    if (!list) return;

    list.replaceChildren();

    if (resources.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "empty-state attachment-empty";

      const title = document.createElement("strong");
      title.textContent = "No resources yet.";

      const text = document.createElement("span");
      text.textContent = "Add files or links for students to download or open.";

      emptyState.append(title, text);
      list.appendChild(emptyState);
      return;
    }

    resources.forEach((resource, index) => {
      const row = document.createElement("article");
      row.className = "attachment-row";

      const icon = document.createElement("span");
      icon.className = `attachment-icon attachment-icon-${resource.type || "link"}`;
      icon.textContent = resource.type === "file" ? "F" : resource.type === "note" ? "R" : "L";

      const content = document.createElement("div");
      content.className = "attachment-row-main";

      const titleElement = resource.url
        ? document.createElement("a")
        : document.createElement("span");
      titleElement.textContent = getAttachmentTitle(resource);

      if (resource.url) {
        titleElement.href = resource.url;

        if (resource.type === "file") {
          titleElement.download = resource.fileName || resource.filename || getAttachmentTitle(resource);
        } else {
          titleElement.target = "_blank";
          titleElement.rel = "noopener";
        }
      }

      const meta = document.createElement("small");
      meta.textContent = getAttachmentMeta(resource);

      content.append(titleElement, meta);

      const removeButton = document.createElement("button");
      removeButton.className = "btn btn-sm btn-link attachment-remove";
      removeButton.type = "button";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => onRemove(index));

      row.append(icon, content, removeButton);
      list.appendChild(row);
    });
  };

  const initAttachmentManagers = () => {
    document.querySelectorAll("[data-attachment-manager]").forEach((manager) => {
      const store = manager.querySelector("[data-attachment-store]");
      const fileInput = manager.querySelector("[data-attachment-file-input]");
      const addFileButton = manager.querySelector("[data-add-attachment-file]");
      const addLinkButton = manager.querySelector("[data-add-attachment-link]");

      if (!store) return;

      let resources = parseAttachmentResources(store.value);

      const syncAndRender = () => {
        syncAttachmentStore(store, resources);
        renderAttachmentList(manager, resources, (index) => {
          resources = resources.filter((_, resourceIndex) => resourceIndex !== index);
          syncAndRender();
        });
      };

      addLinkButton?.addEventListener("click", () => {
        const rawUrl = window.prompt("Paste the resource link URL");
        const url = normalizeAttachmentLink(rawUrl);

        if (!rawUrl) return;

        if (!url) {
          alert("Use a valid http, https, or mailto link.");
          return;
        }

        const title =
          window.prompt("Resource title", rawUrl.replace(/^https?:\/\//i, "")) ||
          rawUrl.replace(/^https?:\/\//i, "");
        const resource = {
          id: createAttachmentId("link"),
          type: "link",
          title: title.trim() || url,
          url,
        };

        if (!canStoreAttachmentResource(resources, resource)) {
          alert("This course already has too much attachment data. Use a link for large files.");
          return;
        }

        resources = [...resources, resource];
        syncAndRender();
      });

      addFileButton?.addEventListener("click", () => {
        fileInput?.click();
      });

      fileInput?.addEventListener("change", async () => {
        const files = Array.from(fileInput.files || []);

        for (const file of files) {
          if (file.size > MAX_ATTACHMENT_FILE_SIZE) {
            alert(`${file.name} is too large. Use files up to 6MB or add it as a link.`);
            continue;
          }

          try {
            const dataUrl = await readFileAsDataUrl(file);
            const resource = {
              id: createAttachmentId("file"),
              type: "file",
              title: file.name,
              fileName: file.name,
              mimeType: file.type || "application/octet-stream",
              size: file.size,
              url: dataUrl,
            };

            if (!canStoreAttachmentResource(resources, resource)) {
              alert("This course already has too much attachment data. Use a link for large files.");
              continue;
            }

            resources = [...resources, resource];
          } catch (error) {
            alert(`Could not add ${file.name}.`);
          }
        }

        fileInput.value = "";
        syncAndRender();
      });

      syncAndRender();
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-rich-editor]").forEach(initRichEditor);
    initImageInputs();
    initFocusButtons();
    initChapterReorder();
    initMuxUploaders();
    initAttachmentManagers();
  });
})();
