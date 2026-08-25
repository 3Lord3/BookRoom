import { baseApi } from '@shared/api/base-api';
import type { Office } from '@shared/api/dto';

export const officesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOffices: build.query<Office[], void>({
      query: () => '/offices',
      providesTags: ['Office'],
    }),
  }),
});

export const { useGetOfficesQuery } = officesApi;
