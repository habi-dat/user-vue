<template>
  <ag-grid-vue
    :localeText="aggridLocale.locale_de"
    style="width: 100%; height: 100%"
    class="ag-theme-material"
    :defaultColDef="defaultColDef"
    :columnDefs="columnDefs"
    :rowData="rowData"
    rowSelection="single"
    @grid-ready="onGridReady"
    @first-data-rendered="onFirstDataRendered"
    @selection-changed="onSelectionChanged"
    domLayout='autoHeight'
  />
</template>

<script>
import axios from 'axios'
import moment from 'moment'
import router from '../../router'
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-material.css";
import aggridLocale from '@/assets/ag-grid.locale.js';
import { AgGridVue } from "ag-grid-vue";
import ChipCell from '@/components/table/ChipCell'
export default {
  name: 'UserTable',
  components: {
    AgGridVue,
    ChipCell
  },
  props: ['users', 'search', 'showGroups'],
  data () {
    return {
      defaultColDef: [],
      columnDefs: [],
      rowData: [],
      aggridLocale: aggridLocale,
      selectedRows: [],
      gridApi: null,
      columnApi: null,
    }
  },
  watch: {
    search(newSearch, oldSearch) {
      this.gridApi.setQuickFilter(newSearch);
      this.gridApi.onFilterChanged();
    }
  },
  methods: {
    onGridReady(params) {
        this.gridApi = params.api;
        this.columnApi = params.columnApi;
    },
    onFirstDataRendered(params) {
        this.columnApi.autoSizeAllColumns()
    },
    onSelectionChanged() {
        this.selectedRows = this.gridApi.getSelectedRows();
        this.$emit('selectUser', this.selectedRows);
    },
  },
  created() {
    this.columnDefs = [
      { checkboxSelection: true, maxWidth: 50},
      { headerName: "ID", field: "uid"},
      { headerName: "Anzeigename", field: "cn"},
      { headerName: "E-Mail", field: "mail"},
      { headerName: "Zugehörigkeit", field: "title"},
      { headerName: "Ort", field: "l"}
    ];
    if (this.showGroups) {
      this.columnDefs.push(
        { headerName: "Mitglied in", field: "memberGroups", cellStyle: {'white-space': 'normal'}, maxWidth: 250, autoHeight: true,cellRenderer: 'ChipCell', cellRendererParams: { icon: 'group', color: 'success', field: 'o' }
        }
      )
      this.columnDefs.push(
        { headerName: "Admin von", field: "ownerGroups", cellStyle: {'white-space': 'normal'}, maxWidth: 250, autoHeight: true,cellRenderer: 'ChipCell', cellRendererParams: { icon: 'edit', color: 'info', field: 'o' }
        }
      )
    }
    this.defaultColDef = {
      resizable: true,
      filterable: true,
      sortable: true
    };
    this.rowData = this.users;
  },
}
</script>
