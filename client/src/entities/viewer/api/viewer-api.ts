import { baseApi } from '@shared/api/base-api';
import type { User } from '@shared/api/dto';

export const viewerApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getViewer: build.query<User, void>({
      query: () => '/me',
      providesTags: ['Viewer'],
    }),
  }),
});

export const { useGetViewerQuery } = viewerApi;
