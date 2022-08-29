<template>
    <v-card outlined style="display: flex; flex-direction:column" width="100%" height="100%">
      <v-toolbar flat>
        <v-card-title>Einladungen</v-card-title>
        <v-spacer></v-spacer>
        <v-text-field
            prepend-icon="search"
            label="Suchen..."
            v-model="search"
            single-line
            hide-details
            dense
          />
      </v-toolbar>
      <v-divider />
      <v-card-text style="height:100%">
        <ag-grid-vue
          :localeText="aggridLocale.locale_de"
          style="width: 100%; height: 100%"
          class="ag-theme-material"
          :defaultColDef="defaultColDef"
          :columnDefs="columnDefs"
          :rowData="rowData"
          rowSelection="multiple"
          :isRowSelectable="inviteSelectable"
          :getRowId="getRowId"
          @grid-ready="onGridReady"
          @first-data-rendered="onFirstDataRendered"
          @selection-changed="onSelectionChanged"
        >
      </ag-grid-vue>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn @click="repeatInvites" color="success" :disabled="selectedRows.length === 0" aria-label="Einladung(en) erneut senden" data-microtip-position="top-left" role="tooltip"><v-icon>refresh</v-icon></v-btn>
        <v-btn @click="deleteInvites" color="error" :disabled="selectedRows.length === 0" aria-label="Einladung(en) löschen" data-microtip-position="top-left" role="tooltip"><v-icon>delete</v-icon></v-btn>
        <v-btn to="/invite" color="success"aria-label="Jemenschen einladen" data-microtip-position="top-left" role="tooltip"><v-icon>add</v-icon></v-btn>
      </v-card-actions>
      <ConfirmDialog ref="confirm" />
    </v-card>
</template>

<script>
import axios from 'axios'
import moment from 'moment'
import router from '../../router'
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-material.css";
import aggridLocale from '@/assets/ag-grid.locale.js';
import { AgGridVue } from "ag-grid-vue";
import ChipCell from '@/components/table/ChipCell';
import ConfirmDialog from '@/components/ConfirmDialog'
export default {
  name: 'Invites',
  components: {
    AgGridVue,
    ChipCell,
    ConfirmDialog
  },
  data () {
    return {
      defaultColDef: [],
      columnDefs: [],
      rowData: [],
      aggridLocale: aggridLocale,
      statusPanels: [
            {
                statusPanel: 'agTotalAndFilteredRowCountComponent',
                align: 'left',
            }
        ],
      selectedRows: [],
      search: '',
      autoSizeColumns:true,
      gridApi: null,
      columnApi: null
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
    },
    getRowId(params) {
      return params.data.token;
    },
    getInvites: function () {
      let self = this
      axios.get('/api/user/invites')
        .then(response => {
          self.rowData = response.data.invites.map(invite => {
            return {
              mail: invite.data.mail,
              expires: moment(invite.expires),
              invitedBy: invite.currentUser.cn,
              created: moment(invite.created),
              member: invite.data.member.map((item) => {return item.split(',')[0].split('=')[1];}),
              owner: invite.data.owner.map((item) => {return item.split(',')[0].split('=')[1];}),
              data: invite.data,
              currentUser: invite.currentUser,
              token: invite.token
            }
          })
        })
        .catch(error => {})
    },
    inviteSelectable(params) {
      var user = this.$store.state.user
      var groups = [].concat(params.data.data.owner).concat(params.data.data.member);
      var selectable = true;
      if (user.isGroupAdmin && !user.isAdmin
        && params.data.currentUser.dn !== user.dn
        && groups.length > 0) {
        groups.forEach(group => {
          if (!user.owner.includes(group)) {
            selectable = false;
          }
        })
      }
      return selectable;
    },
    async deleteInvites() {
      var emails = this.selectedRows.map(row => { return row.mail}).join(', ');
      if (
          await this.$refs.confirm.open(
            'Bist du sicher?',
            'Willst du die Einladung(en) an ' + emails + ' wirklich löschen?'
          )
        ) {
          axios.delete('/api/user/invites', {data: {tokens: this.selectedRows.map(row => { return row.token})}})
            .then(response => {
              this.$snackbar.success('Einladung(en) an ' + emails + ' gelöscht')
              this.gridApi.applyTransaction({ remove: this.selectedRows});
            })
        }
    },
    repeatInvites() {
      var emails = this.selectedRows.map(row => { return row.mail}).join(', ');
      axios.put('/api/user/invites/repeat', {tokens: this.selectedRows.map(row => { return row.token})})
        .then(response => {
          this.$snackbar.success('Einladung(en) an ' + emails + ' erneut gesendet')
          this.gridApi.applyTransaction({ update: response.data.invites});
        })
    }
  },
  mounted() {
    this.columnDefs = [
      { checkboxSelection: true, maxWidth: 50},
      { headerName: "E-Mail Adresse", field: "mail"},
      { headerName: "Eingeladen von", field: "invitedBy"},
      { headerName: "Eingeladen am", field: "created", type: 'dateColumn',
        valueFormatter: function (params) {
          return moment(params.value).format('DD.MM.YYYY');
          }
      },
      { headerName: "Gültig bis", field: "expires", type: 'dateColumn',
        valueFormatter: function (params) {
          return moment(params.value).format('DD.MM.YYYY');
        }
      },
      { headerName: "Mitglied in", field: "member", cellStyle: {'white-space': 'normal'}, maxWidth: 250, autoHeight: true,cellRenderer: 'ChipCell', cellRendererParams: { icon: 'group', color: 'success' }
      },
      { headerName: "Admin von", field: "owner", cellStyle: {'white-space': 'normal'}, maxWidth: 250, autoHeight: true, cellRenderer: 'ChipCell', cellRendererParams: { icon: 'edit', color: 'info' }
      }
    ];
    this.defaultColDef = {
      filter: true,
      sortable: true,
      resizable: true
    };
    this.getInvites()
  },
}
</script>
