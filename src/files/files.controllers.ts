import { createFactory } from "hono/factory";

import { zValidator } from "@hono/zod-validator";

import { z } from "zod";

import {
  deleteFileService,
  listFilesService,
  listFoldersService,
  updateFileService,
  uploadFilesService,
} from "./files.services";
import { Bindings } from "../types/bindings";
import { createAPIResponse } from "../utils/api-response-helper";
import { Context } from "hono";
import { createId } from "../utils/create-id";
import { toDosyaFiles } from "../../../dosya/src/utils/to-dosya-files";
import { buildTree } from "../../../dosya/src/utils/build-tree";

const factory = createFactory<{
  Bindings: Bindings;
}>();

// LIST FILE
export const listFiles = factory.createHandlers(
  zValidator(
    "json",
    z.object({
      folder: z.string().optional(),
      cursor: z.string().optional(),
      limit: z.string().optional(),
    })
  ),
  async (c) => {
    const { folder, cursor, limit } = c.req.valid("json");

    try {
      const data = await listFilesService(c, folder, cursor, limit);

      return c.json(
        createAPIResponse({
          status: "success",
          data: {
            cursor: data.page,
            files: data.files,
          },
        })
      );
    } catch (error) {
      return c.json(
        createAPIResponse({
          status: "error",
          error: error as Error,
          message: (error as Error).message,
        })
      );
    }
  }
);

// UPLOAD FILE
export const uploadFile = factory.createHandlers(async (c) => {
  const body = await c.req.parseBody();

  const files = Object.values(body).filter(
    (value) => value instanceof File
  ) as File[];

  const path = body["path"] as string;

  try {
    const urls = await uploadFilesService(c, files, path);

    return c.json(createAPIResponse({ status: "success", data: urls }));
  } catch (error) {
    console.error(error);

    return c.json(
      createAPIResponse({
        status: "error",
        error: error as Error,
        message: (error as Error).message,
      })
    );
  }
});

// UPDATE FILE
export const updateFile = factory.createHandlers(
  zValidator(
    "form",
    z.object({
      oldPath: z.string(),
      file: z.instanceof(File),
      newPath: z.string(),
      fileName: z.string().optional(),
    })
  ),
  async (c) => {
    const body = await c.req.parseBody();

    try {
      const updatedFile = await updateFileService(
        c,
        body["oldPath"] as string,
        body["file"] as File,
        body["newPath"] as string,
        body["fileName"] as string
      );

      return c.json(
        createAPIResponse({ status: "success", data: updatedFile })
      );
    } catch (error) {
      return c.json(
        createAPIResponse({
          status: "error",
          error: error as Error,
          message: (error as Error).message,
        })
      );
    }
  }
);

// DELETE FILE
export const deleteFile = factory.createHandlers(
  zValidator(
    "json",
    z.object({
      path: z.string(),
    })
  ),
  async (c) => {
    const { path } = c.req.valid("json");

    try {
      const deletedFile = await deleteFileService(c, path);

      return c.json(createAPIResponse({ status: "success" }));
    } catch (error) {
      return c.json(
        createAPIResponse({
          status: "error",
          error: error as Error,
          message: (error as Error).message,
        })
      );
    }
  }
);

// LIST FOLDERS
export const getFolders = factory.createHandlers(
  // zValidator(
  //   "json",
  //   z.object({
  //     key: z.string(),
  //   })
  // ),
  async (c) => {
    try {
      // Inicia a recursão a partir da key informada
      const folderData = await listFoldersService(c);
      return c.json(createAPIResponse({ status: "success", data: folderData }));
    } catch (error) {
      return c.json(
        createAPIResponse({
          status: "error",
          error: error as Error,
          message: (error as Error).message,
        })
      );
    }
  }
);

// CREATE FOLDER
export const createFolder = factory.createHandlers(
  zValidator(
    "json",
    z.object({
      name: z.string(),
    })
  ),
  async (c) => {
    const { name } = c.req.valid("json");

    const metadata = {
      tags: ["importante", "trabalho"],
      color: "#ff5733",
      createdAt: new Date().toISOString(),
    };

    try {
      const data = await (c.env as Bindings).BUCKET.put(
        `${name}/.config.json`,
        JSON.stringify(metadata),
        {
          httpMetadata: {
            contentType: "application/json",
          },
        }
      );

      const response = {
        ...(await listFoldersService(c)),
        data,
      };

      return c.json(
        createAPIResponse({
          status: "success",
          data: response,
        })
      );
    } catch (error) {
      return c.json(
        createAPIResponse({
          status: "error",
          error: error as Error,
          message: (error as Error).message,
        })
      );
    }
  }
);

// DELETE FOLDER
export const deleteFolder = factory.createHandlers(
  zValidator(
    "json",
    z.object({
      folder: z.string(),
    })
  ),
  async (c) => {
    // const user = c.get("user");
    // if (!user) {
    //   throw new Error("Unauthorized");
    // }

    const { folder } = c.req.valid("json");

    try {
      const listResponse = await (c.env as Bindings).BUCKET.list({
        prefix: folder,
      });

      // Para cada objeto encontrado, chama delete
      const deletePromises = listResponse.objects.map((obj: any) =>
        (c.env as Bindings).BUCKET.delete(obj.key)
      );

      const results = await Promise.all(deletePromises);

      return c.json(createAPIResponse({ status: "success" }));
    } catch (error) {
      return c.json(
        createAPIResponse({
          status: "error",
          error: error as Error,
          message: (error as Error).message,
        })
      );
    }
  }
);
