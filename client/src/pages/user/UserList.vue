<template>
  <v-card outlined style="display: flex; flex-direction:column" width="100%" height="100%">
    <v-toolbar flat>
      <v-card-title>Accounts</v-card-title>
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
      <UserTable v-if="usersLoaded" :users="users" :search="search" @selectUser="onSelectUser" showGroups="true"/>
    </v-card-text>
    <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn @click="editUser" color="primary" :disabled="selectedUsers.length === 0" aria-label="Account bearbeiten" data-microtip-position="top-left" role="tooltip"><v-icon>edit</v-icon></v-btn>
        <v-btn @click="deleteUser" color="error" :disabled="selectedUsers.length === 0" aria-label="Account löschen" data-microtip-position="top-left" role="tooltip"><v-icon>delete</v-icon></v-btn>
        <v-btn to="/user/create" color="success"aria-label="Account erstellen" data-microtip-position="top-left" role="tooltip"><v-icon>add</v-icon></v-btn>
      </v-card-actions>
      <ConfirmDialog ref="confirm" />
  </v-card>
</template>

<script>

import axios from 'axios'
import router from '@/router'
import UserTable from '@/components/user/UserTable'
import ConfirmDialog from '@/components/ConfirmDialog'
export default {
  components: {UserTable, ConfirmDialog},
  data() {
    return {
      users: [],
      selectedUsers: [],
      usersLoaded: false,
      search: ''
    }
  },
  methods: {
    onSelectUser: function(selectedRows) {
      this.selectedUsers = selectedRows;
    },
    deleteUser() {
      return;
    },
    editUser() {

    },
    getUsers: function () {
      var self = this;
      axios.get('/api/users')
        .then(response => {
          self.users = response.data.users;
          self.usersLoaded = true;
        });
    }
  },
  async created() {
    this.getUsers();
  }
}
</script>