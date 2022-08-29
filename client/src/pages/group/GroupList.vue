<template>
  <v-card outlined style="display: flex; flex-direction:column" width="100%" height="100%">
    <v-toolbar flat>
      <v-card-title>Gruppen</v-card-title>
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
    <v-card-text style="height:100%;overflow: hidden;">
      <GroupTable v-if="groupsLoaded" :groups="groups" :search="search" @selectGroup="onSelectGroup" showMembers="true" rowSelection="single"/>
    </v-card-text>
    <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn @click="editGroup" color="primary" :disabled="selectedGroups.length === 0" aria-label="Gruppe bearbeiten" data-microtip-position="top-left" role="tooltip"><v-icon>edit</v-icon></v-btn>
        <v-btn @click="deleteGroup" color="error" :disabled="selectedGroups.length === 0" aria-label="Gruppe löschen" data-microtip-position="top-left" role="tooltip"><v-icon>delete</v-icon></v-btn>
        <v-btn to="/group/add" color="success"aria-label="Gruppe erstellen" data-microtip-position="top-left" role="tooltip"><v-icon>add</v-icon></v-btn>
      </v-card-actions>
      <ConfirmDialog ref="confirm" />
  </v-card>
</template>

<script>

import axios from 'axios'
import router from '@/router'
import GroupTable from '@/components/group/GroupTable'
import ConfirmDialog from '@/components/ConfirmDialog'
export default {
  components: {GroupTable, ConfirmDialog},
  data() {
    return {
      groups: [],
      selectedGroups: [],
      groupsLoaded: false,
      search: ''
    }
  },
  methods: {
    onSelectGroup: function(selectedRows) {
      this.selectedGroups = selectedRows;
    },
    deleteGroup() {
      return;
    },
    editGroup() {

    },
    getGroups: function () {
      var self = this;
      axios.get('/api/groups')
        .then(response => {
          self.groups = response.data.groups;
          self.groupsLoaded = true;
        });
    }
  },
  async created() {
    this.getGroups();
  }
}
</script>