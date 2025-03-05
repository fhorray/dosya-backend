import { Context } from "hono";
import { Bindings } from "../types/bindings";
import { buildTree } from "../../../dosya/src/utils/build-tree";
import { toDosyaFiles } from "../../../dosya/src/utils/to-dosya-files";

// LIST FILES
export const listFilesService = async (
  c: Context<{ Bindings: Bindings }>,
  folder?: string,
  page?: string,
  limit?: string
) => {
  try {
    const files = await c.env.BUCKET.list({
      prefix: folder,
      limit: limit ? Number(limit) : 20,
    });

    console.log(files.truncated, files);

    return {
      page: files.truncated ? files.cursor : undefined,
      files: toDosyaFiles(files.objects),
    };

    // let allObjects: R2Object[] = [];
    // let cursor: string | undefined;

    // do {
    //   const result = await c.env.BUCKET.list({
    //     prefix: path ?? "files/",
    //     cursor,
    //   });

    //   allObjects.push(...result.objects); // Adiciona os arquivos encontrados
    //   cursor = result.truncated ? result.cursor : undefined; // Atualiza o cursor
    // } while (cursor); // Continua até não haver mais objetos

    // return allObjects; // Retorna todos os arquivos listados
  } catch (error) {
    throw new Error(`Error trying to list files.`);
  }
};

// LIST FOLDERS
export const listFoldersService = async (
  c: Context<{ Bindings: Bindings }>
) => {
  try {
    let allObjects: R2Object[] = [];
    let cursor: string | undefined;
    const metadataMap: Record<string, any> = {}; // 🔹 Armazena metadados das pastas

    // 🔄 Loop para pegar todos os arquivos do bucket (paginações)
    do {
      const result = await c.env.BUCKET.list({ cursor });

      allObjects.push(...result.objects); // Adiciona os objetos listados
      cursor = result.truncated ? result.cursor : undefined; // Atualiza o cursor
    } while (cursor); // Continua até não haver mais objetos

    // 🔹 Filtrar arquivos de configuração e buscar seus metadados
    for (const obj of allObjects) {
      if (obj.key.endsWith("/.config.json")) {
        const configFile = await c.env.BUCKET.get(obj.key);
        if (configFile) {
          const text = await configFile.text();
          try {
            const metadata = JSON.parse(text);
            const folderKey = obj.key.replace("/.config.json", ""); // Remove o nome do arquivo
            metadataMap[folderKey] = metadata; // Armazena no mapa de metadados
          } catch (e) {
            console.error(`Erro ao analisar JSON de ${obj.key}:`, e);
          }
        }
      }
    }

    // 🔹 Constrói a árvore com metadados e retorna
    return buildTree(allObjects, metadataMap);
  } catch (error) {
    throw new Error(`Erro ao listar arquivos: ${error}`);
  }
};

// UPLOAD FILE
export const uploadFilesService = async (
  c: Context,
  data: File | File[], // Pode ser um único arquivo ou um array de arquivos
  path: string,
  fileName?: string
) => {
  // Função para upload de um único arquivo
  const uploadFile = async (file: File) => {
    const sizeLimit = 4 * 1024 ** 2;

    if (file.size > sizeLimit) {
      throw new Error("File size is too large");
    }

    const fileExtension = file.name.split(".").pop();

    const objKey = `${path}/${
      fileName ??
      `${file.name
        .split(".")[0]
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")}.${fileExtension}`
    }`;

    await c.env.BUCKET.put(objKey, file);

    // URL do CDN
    const cdnUrl = `https://media.grupometrocasa.com/${objKey}`;
    return cdnUrl;
  };

  // Verifica se 'data' é um array de arquivos
  if (Array.isArray(data)) {
    const uploadedFiles = await Promise.all(data.map(uploadFile));
    return uploadedFiles;
  } else {
    return uploadFile(data); // Para um único arquivo
  }
};

// DELETE FILE
export const deleteFileService = async (c: Context, path: string) => {
  try {
    const res = await c.env.BUCKET.delete(path);
  } catch (error) {
    throw new Error("Error trying to delete file");
  }
};

// UPDATE A FILE
export const updateFileService = async (
  c: Context,
  oldPath: string,
  file: File,
  newPath: string,
  fileName?: string
) => {
  const sizeLimit = 4 * 1024 ** 2;

  if (file.size > sizeLimit) {
    throw new Error("File size is too large");
  }

  try {
    // Deleting the old file
    await deleteFileService(c, oldPath);

    // Uploading the new file
    const cdnUrl = await uploadFilesService(c, file, newPath, fileName);

    return cdnUrl;
  } catch (error) {
    throw new Error("Error trying to update file");
  }
};
