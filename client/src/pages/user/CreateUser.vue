<template>
  <v-card outlined style="display: flex; flex-direction:column" width="100%" height="100%">
    <v-toolbar flat>
      <v-card-title>Account erstellen</v-card-title>
    </v-toolbar>
    <v-divider />
    <v-card-text style="height: 100%; overflow: hidden;">
      <v-row style="height: 100%;">
        <v-col sm="12" md="4">
          <UserForm
            :user="user"
            @valid="onValid"
            action="createUser"
            showGroups="true"
            password="true"
            :member="user.memberGroups"
            :owner="user.ownerGroups"
          />
        </v-col>
        <v-divider vertical />
        <v-col md="" sm="12" minHeight="400" style="height: 100%; min-height: 400px; overflow: hidden;">
          <v-toolbar flat>
            <h4>Gruppenauswahl</h4>
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
          <GroupTable
            v-if="groupsLoaded"
            :groups="groups"
            :search="search"
            :flat="!$store.state.user.isAdmin"
            @selectGroup="onSelectGroup"
            comboSelect="true"
            rowSelection="multiple"/>
      </v-col>
    </v-row>
    </v-card-text>
    <v-divider />
    <v-card-actions>
      <v-btn
        text
        @click="$router.go(-1)"
        aria-label="Zurück" data-microtip-position="top-right" role="tooltip"
      >
        <v-icon>arrow_back</v-icon>
      </v-btn>
      <v-spacer />
      <v-btn

        :disabled="!valid"
        color="success"
        @click="save"
        aria-label="Speichern" data-microtip-position="top-left" role="tooltip"
      >
        <v-icon>save</v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import axios from 'axios'
import UserForm from '@/components/user/UserForm'
import GroupTable from '@/components/group/GroupTable'

export default {
  components: { UserForm, GroupTable },
  data() {
    return {
      user: {},
      valid: true,
      groups: [],
      selectedGroups: [],
      groupsLoaded: false,
      search: ''
    }
  },
  methods: {
    onSelectGroup: function(selectedRows) {
      this.selectedGroups = selectedRows;
      this.user.member = [...new Set(selectedRows.map(row => { return row.dn }))]
      this.user.owner = [...new Set(selectedRows.filter(row => { return row.selectCell && row.selectCell.value === 'owner'}).map(row => { return row.dn }))]
      this.user.memberGroups = [];
      this.user.member.forEach(dn => {
        this.user.memberGroups.push(this.selectedGroups.find((group => { return group.dn === dn})))
      })
      this.user.ownerGroups = [];
      this.user.owner.forEach(dn => {
        this.user.ownerGroups.push(this.selectedGroups.find((group => { return group.dn === dn})))
      })
    },
    onValid (valid) {
      this.valid = valid;
    },
    save: function () {
      axios.post('/api/user/profile', this.user)
        .then(response => {
          this.$store.state.config.authenticated = true
          this.$store.state.user = response.data.user
          this.$snackbar.success('Profil gespeichert')
          router.push('/profile')
        })
        .catch(errors => {
          //this.$snackbar.error('Profil konnte nicht gespeichert werden: ' + errors)
          console.log('error at saving profile: ', errors)
        })
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
  created() {
    this.user = { preferredLanguage: 'de', description: '10 GB', member: [], owner: [], memberGroups: [], ownerGroups: []}
    this.getGroups();
  }
}
</script>